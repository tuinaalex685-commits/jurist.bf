-- ============================================================================
-- 0012 — Gamification : série (streak) + maîtrise d'article (sceau, XP, rang, badges).
-- Tout atomique, SECURITY INVOKER (l'utilisateur n'écrit que ses données via RLS).
-- ============================================================================
begin;

-- 1) record_activity_attempt (remplace 0011) : + mise à jour de la SÉRIE quotidienne.
create or replace function record_activity_attempt(
  p_activity_id uuid, p_response jsonb, p_score numeric, p_passed boolean, p_detail jsonb
) returns jsonb
language plpgsql security invoker set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_version uuid; v_phase int;
  v_tw numeric; v_ws numeric; v_total int; v_done int; v_score numeric; v_ok boolean;
  v_pass constant numeric := 0.7;
begin
  if v_uid is null then raise exception 'UNAUTHENTICATED'; end if;

  select article_version_id, phase into v_version, v_phase
    from activities where id = p_activity_id and status = 'published';
  if v_version is null then raise exception 'ACTIVITY_NOT_FOUND'; end if;

  insert into activity_attempts (user_id, activity_id, response, score, passed, detail)
  values (v_uid, p_activity_id, p_response, p_score, p_passed, p_detail);

  select coalesce(sum(a.weight),0), coalesce(sum(a.weight*coalesce(b.s,0)),0), count(*), count(b.activity_id)
    into v_tw, v_ws, v_total, v_done
  from activities a
  left join (select activity_id, max(score) s from activity_attempts where user_id = v_uid group by activity_id) b
    on b.activity_id = a.id
  where a.article_version_id = v_version and a.phase = v_phase and a.status = 'published';

  v_score := case when v_tw > 0 then v_ws / v_tw
                  when v_total > 0 then v_done::numeric / v_total else 0 end;
  v_ok := v_score >= v_pass;

  insert into user_phase_progress (user_id, article_version_id, phase, status, score, completed_at)
  values (v_uid, v_version, v_phase, case when v_ok then 'completed' else 'in_progress' end, v_score,
          case when v_ok then now() else null end)
  on conflict (user_id, article_version_id, phase) do update
    set status = excluded.status, score = excluded.score,
        completed_at = case when v_ok then coalesce(user_phase_progress.completed_at, now()) else null end;

  -- Série quotidienne (mise à jour une fois par jour).
  update user_stats set
    streak_days = case when last_active_on = current_date - 1 then streak_days + 1
                       when last_active_on = current_date then streak_days else 1 end,
    last_active_on = current_date
  where user_id = v_uid and (last_active_on is distinct from current_date);

  return jsonb_build_object('phase', v_phase, 'phase_score', round(v_score,3), 'phase_completed', v_ok);
end $$;

revoke all on function record_activity_attempt(uuid, jsonb, numeric, boolean, jsonb) from public;
grant execute on function record_activity_attempt(uuid, jsonb, numeric, boolean, jsonb) to authenticated;

-- 2) award_article_mastery : si toutes les phases sont validées, décerne sceau + XP + rang + badges.
create or replace function award_article_mastery(p_version uuid) returns jsonb
language plpgsql security invoker set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_article uuid;
  v_total_phases int; v_done_phases int;
  v_xp constant int := 250;
  v_new_xp int; v_rank int; v_seals int;
begin
  if v_uid is null then raise exception 'UNAUTHENTICATED'; end if;

  select article_id into v_article from article_versions where id = p_version;
  if v_article is null then return jsonb_build_object('mastered', false); end if;

  select count(distinct phase) into v_total_phases
    from activities where article_version_id = p_version and status = 'published';
  select count(*) into v_done_phases
    from user_phase_progress where user_id = v_uid and article_version_id = p_version and status = 'completed';

  if v_total_phases = 0 or v_done_phases < v_total_phases then
    return jsonb_build_object('mastered', false);
  end if;

  -- Déjà maîtrisé ? (idempotent)
  if exists (select 1 from seals where user_id = v_uid and article_id = v_article) then
    return jsonb_build_object('mastered', true, 'already', true);
  end if;

  insert into seals (user_id, article_id, article_version_id) values (v_uid, v_article, p_version)
    on conflict (user_id, article_id) do nothing;
  insert into xp_ledger (user_id, delta, reason, ref_type, ref_id)
    values (v_uid, v_xp, 'article_mastered', 'article', v_article);
  insert into user_article_progress (user_id, article_id, article_version_id, status, mastery_score, mastered_at)
    values (v_uid, v_article, p_version, 'mastered', 1, now())
    on conflict (user_id, article_id) do update
      set status = 'mastered', mastery_score = 1, mastered_at = now();

  -- Recalcul des stats (source = journaux append-only).
  select coalesce(sum(delta),0) into v_new_xp from xp_ledger where user_id = v_uid;
  select coalesce(max(level),1) into v_rank from ranks where xp_threshold <= v_new_xp;
  select count(*) into v_seals from seals where user_id = v_uid;
  update user_stats set xp_total = v_new_xp, rank_level = v_rank, mastered_count = v_seals where user_id = v_uid;

  -- Badges liés au nombre de sceaux.
  if v_seals >= 1 then
    insert into user_badges (user_id, badge_id) select v_uid, id from badges where code = 'first_seal'
      on conflict do nothing;
  end if;
  if v_seals >= 10 then
    insert into user_badges (user_id, badge_id) select v_uid, id from badges where code = 'ten_articles'
      on conflict do nothing;
  end if;

  return jsonb_build_object('mastered', true, 'new', true, 'xp_gained', v_xp, 'xp_total', v_new_xp, 'rank_level', v_rank);
end $$;

revoke all on function award_article_mastery(uuid) from public;
grant execute on function award_article_mastery(uuid) to authenticated;

commit;
