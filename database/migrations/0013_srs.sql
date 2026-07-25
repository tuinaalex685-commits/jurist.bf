-- ============================================================================
-- 0013 — Révision espacée (SRS, SM-2 simplifié)
-- Une carte SRS par article maîtrisé (item_ref='article'). Notation atomique,
-- transactionnelle, RLS (SECURITY INVOKER). État dérivé de l'intervalle.
-- ============================================================================
begin;

-- 1) À la maîtrise d'un article, planifier sa première révision (idempotent).
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

  -- Planifie la première révision (J+1, état "fragile" : tout juste appris).
  insert into srs_cards (user_id, article_id, item_ref, ease, interval_days, reps, state, due_at)
  values (v_uid, v_article, 'article', 2.5, 1, 0, 'fragile', now() + interval '1 day')
  on conflict (user_id, article_id, item_ref) do nothing;

  select coalesce(sum(delta),0) into v_new_xp from xp_ledger where user_id = v_uid;
  select coalesce(max(level),1) into v_rank from ranks where xp_threshold <= v_new_xp;
  select count(*) into v_seals from seals where user_id = v_uid;
  update user_stats set xp_total = v_new_xp, rank_level = v_rank, mastered_count = v_seals where user_id = v_uid;

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

-- 2) Notation d'une révision (SM-2 simplifié). p_grade: 0..5 (qualité de rappel).
create or replace function grade_srs_review(p_card_id uuid, p_grade int) returns jsonb
language plpgsql security invoker set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_card srs_cards;
  v_ease numeric; v_interval int; v_reps int; v_state text;
begin
  if v_uid is null then raise exception 'UNAUTHENTICATED'; end if;
  if p_grade < 0 or p_grade > 5 then raise exception 'INVALID_GRADE'; end if;

  select * into v_card from srs_cards where id = p_card_id and user_id = v_uid for update;
  if v_card is null then raise exception 'CARD_NOT_FOUND'; end if;

  v_ease := greatest(1.3, v_card.ease + (0.1 - (5 - p_grade) * (0.08 + (5 - p_grade) * 0.02)));

  if p_grade < 3 then
    v_reps := 0;
    v_interval := 1;
  else
    v_reps := v_card.reps + 1;
    v_interval := case
      when v_reps = 1 then 1
      when v_reps = 2 then 6
      else round(v_card.interval_days * v_ease)::int
    end;
  end if;

  v_state := case
    when v_interval <= 1 then 'urgent'
    when v_interval <= 6 then 'fragile'
    when v_interval <= 15 then 'correct'
    when v_interval <= 30 then 'mastered'
    else 'anchored' end;

  update srs_cards set
    ease = v_ease, interval_days = v_interval, reps = v_reps,
    lapses = case when p_grade < 3 then lapses + 1 else lapses end,
    state = v_state, due_at = now() + (v_interval || ' days')::interval,
    last_reviewed_at = now()
  where id = p_card_id;

  insert into review_logs (user_id, card_id, grade, prev_interval, next_interval)
  values (v_uid, p_card_id, p_grade, v_card.interval_days, v_interval);

  -- Une révision compte comme une activité du jour (série).
  update user_stats set
    streak_days = case when last_active_on = current_date - 1 then streak_days + 1
                       when last_active_on = current_date then streak_days else 1 end,
    last_active_on = current_date
  where user_id = v_uid and (last_active_on is distinct from current_date);

  return jsonb_build_object('state', v_state, 'interval_days', v_interval, 'due_at', (now() + (v_interval || ' days')::interval));
end $$;

revoke all on function grade_srs_review(uuid, int) from public;
grant execute on function grade_srs_review(uuid, int) to authenticated;

commit;
