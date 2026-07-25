-- ============================================================================
-- 0014 — Examens (« L'Épreuve ») : sessions, notation, résultats.
-- Durcissement sécurité : exam_questions_bank passe en lecture ADMIN-ONLY
-- (le payload contient le corrigé — même principe que activity_solutions).
-- Le service serveur (SECURITY DEFINER) lit les questions et sert un payload
-- public dépouillé du corrigé.
-- ============================================================================
begin;

-- Durcissement : plus de lecture "published" côté étudiant sur la banque de questions.
drop policy if exists exam_questions_bank_read on exam_questions_bank;
-- (la policy _write existante, admin-only, couvre déjà la lecture admin via "for all")

-- 1) Démarrage de session : sélectionne N questions publiées du périmètre de l'examen,
--    crée la session + son instantané de questions (sans réponses). Idempotent.
create or replace function start_exam_session(p_exam_id uuid, p_idempotency_key text default null)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_exam exams;
  v_code_id uuid;
  v_session_id uuid;
  v_count int;
begin
  if v_uid is null then raise exception 'UNAUTHENTICATED'; end if;

  select * into v_exam from exams where id = p_exam_id and status = 'published';
  if v_exam is null then raise exception 'EXAM_NOT_FOUND'; end if;

  if p_idempotency_key is not null then
    select id into v_session_id from exam_sessions where idempotency_key = p_idempotency_key;
    if v_session_id is not null then
      return jsonb_build_object('session_id', v_session_id, 'already', true);
    end if;
  end if;

  v_code_id := (v_exam.scope->>'code_id')::uuid;

  insert into exam_sessions (exam_id, user_id, idempotency_key)
  values (p_exam_id, v_uid, p_idempotency_key)
  returning id into v_session_id;

  insert into exam_session_questions (session_id, question_id)
  select v_session_id, q.id
  from exam_questions_bank q
  join article_versions av on av.id = q.article_version_id
  join articles a on a.id = av.article_id
  where q.status = 'published' and (v_code_id is null or a.code_id = v_code_id)
  order by random()
  limit greatest(1, coalesce((v_exam.scope->>'question_count')::int, 5));

  get diagnostics v_count = row_count;
  if v_count = 0 then raise exception 'NO_QUESTIONS_AVAILABLE'; end if;

  return jsonb_build_object('session_id', v_session_id, 'already', false);
end $$;

revoke all on function start_exam_session(uuid, text) from public;
grant execute on function start_exam_session(uuid, text) to authenticated;

-- 2) Enregistre une réponse (avant soumission finale). Idempotent par question.
create or replace function submit_exam_answer(p_session_id uuid, p_question_id uuid, p_answer jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'UNAUTHENTICATED'; end if;

  if not exists (select 1 from exam_sessions where id = p_session_id and user_id = v_uid and submitted_at is null) then
    raise exception 'SESSION_NOT_FOUND';
  end if;

  update exam_session_questions
    set given_answer = p_answer
  where session_id = p_session_id and question_id = p_question_id;

  if not found then raise exception 'QUESTION_NOT_IN_SESSION'; end if;
end $$;

revoke all on function submit_exam_answer(uuid, uuid, jsonb) from public;
grant execute on function submit_exam_answer(uuid, uuid, jsonb) to authenticated;

-- 3) Soumission finale : corrige toutes les questions, calcule score/réussite,
--    XP si réussi, badge "sans faute" si score parfait. Atomique.
create or replace function submit_exam_session(p_session_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_session exam_sessions;
  v_exam exams;
  v_total int; v_correct int; v_xp int := 150;
  v_score numeric; v_passed boolean; v_new_xp int; v_rank int;
begin
  if v_uid is null then raise exception 'UNAUTHENTICATED'; end if;

  select * into v_session from exam_sessions where id = p_session_id and user_id = v_uid for update;
  if v_session is null then raise exception 'SESSION_NOT_FOUND'; end if;
  if v_session.submitted_at is not null then
    return jsonb_build_object('already', true, 'score', v_session.score, 'passed', v_session.passed);
  end if;

  select * into v_exam from exams where id = v_session.exam_id;

  update exam_session_questions esq
    set correct = (
      lower(trim(both '"' from (esq.given_answer)::text)) =
      lower(trim(both '"' from (b.payload->'correct')::text))
    )
  from exam_questions_bank b
  where esq.session_id = p_session_id and esq.question_id = b.id;

  select count(*), count(*) filter (where correct) into v_total, v_correct
  from exam_session_questions where session_id = p_session_id;

  v_score := case when v_total > 0 then v_correct::numeric / v_total else 0 end;
  v_passed := v_score >= coalesce(v_exam.pass_threshold, 0.6);

  update exam_sessions set
    submitted_at = now(),
    time_spent_s = extract(epoch from (now() - v_session.started_at))::int,
    score = v_score,
    passed = v_passed,
    breakdown = jsonb_build_object('correct', v_correct, 'total', v_total)
  where id = p_session_id;

  if v_passed then
    insert into xp_ledger (user_id, delta, reason, ref_type, ref_id) values (v_uid, v_xp, 'exam_passed', 'exam_session', p_session_id);
    select coalesce(sum(delta),0) into v_new_xp from xp_ledger where user_id = v_uid;
    select coalesce(max(level),1) into v_rank from ranks where xp_threshold <= v_new_xp;
    update user_stats set xp_total = v_new_xp, rank_level = v_rank where user_id = v_uid;
    if v_score >= 1 then
      insert into user_badges (user_id, badge_id) select v_uid, id from badges where code = 'exam_ace'
        on conflict do nothing;
    end if;
  end if;

  -- Mise à jour de la série (une épreuve compte comme activité du jour).
  update user_stats set
    streak_days = case when last_active_on = current_date - 1 then streak_days + 1
                       when last_active_on = current_date then streak_days else 1 end,
    last_active_on = current_date
  where user_id = v_uid and (last_active_on is distinct from current_date);

  return jsonb_build_object('already', false, 'score', round(v_score,3), 'passed', v_passed, 'correct', v_correct, 'total', v_total, 'xp_gained', case when v_passed then v_xp else 0 end);
end $$;

revoke all on function submit_exam_session(uuid) from public;
grant execute on function submit_exam_session(uuid) to authenticated;

commit;
