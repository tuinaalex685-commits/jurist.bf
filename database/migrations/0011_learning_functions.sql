-- ============================================================================
-- 0011 — Moteur d'apprentissage : enregistrement atomique d'une tentative
-- + recalcul de la progression de phase (score pondéré, seuil de passage).
-- SECURITY INVOKER : tout passe par la RLS (l'utilisateur n'écrit que ses données).
-- La NOTATION (lecture des solutions) reste côté service TS (client admin) —
-- ici on ne fait que persister le score déjà calculé, de façon transactionnelle.
-- ============================================================================
begin;

create or replace function record_activity_attempt(
  p_activity_id uuid,
  p_response    jsonb,
  p_score       numeric,
  p_passed      boolean,
  p_detail      jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_version uuid;
  v_phase   int;
  v_tw      numeric;   -- somme des pondérations
  v_ws      numeric;   -- somme (poids * meilleur score)
  v_total   int;       -- nb d'activités de la phase
  v_done    int;       -- nb d'activités tentées
  v_score   numeric;   -- score de phase 0..1
  v_ok      boolean;   -- phase validée ?
  v_pass    constant numeric := 0.7;  -- seuil de passage de phase
begin
  if v_uid is null then raise exception 'UNAUTHENTICATED'; end if;

  select article_version_id, phase into v_version, v_phase
    from activities where id = p_activity_id and status = 'published';
  if v_version is null then raise exception 'ACTIVITY_NOT_FOUND'; end if;

  -- 1) Persister la tentative (append-only).
  insert into activity_attempts (user_id, activity_id, response, score, passed, detail)
  values (v_uid, p_activity_id, p_response, p_score, p_passed, p_detail);

  -- 2) Recalculer la progression de la phase (meilleur score par activité, pondéré).
  select
    coalesce(sum(a.weight), 0),
    coalesce(sum(a.weight * coalesce(b.s, 0)), 0),
    count(*),
    count(b.activity_id)
  into v_tw, v_ws, v_total, v_done
  from activities a
  left join (
    select activity_id, max(score) as s
    from activity_attempts
    where user_id = v_uid
    group by activity_id
  ) b on b.activity_id = a.id
  where a.article_version_id = v_version and a.phase = v_phase and a.status = 'published';

  v_score := case
    when v_tw > 0 then v_ws / v_tw                       -- phases notées : score pondéré
    when v_total > 0 then v_done::numeric / v_total       -- phases non notées (ex. découverte) : tout tenté
    else 0 end;
  v_ok := v_score >= v_pass;

  -- 3) Upsert de la progression de phase.
  insert into user_phase_progress (user_id, article_version_id, phase, status, score, completed_at)
  values (v_uid, v_version, v_phase,
          case when v_ok then 'completed' else 'in_progress' end,
          v_score,
          case when v_ok then now() else null end)
  on conflict (user_id, article_version_id, phase) do update
    set status = excluded.status,
        score = excluded.score,
        completed_at = case when v_ok then coalesce(user_phase_progress.completed_at, now()) else null end;

  return jsonb_build_object('phase', v_phase, 'phase_score', round(v_score, 3), 'phase_completed', v_ok);
end $$;

revoke all on function record_activity_attempt(uuid, jsonb, numeric, boolean, jsonb) from public;
grant execute on function record_activity_attempt(uuid, jsonb, numeric, boolean, jsonb) to authenticated;

commit;
