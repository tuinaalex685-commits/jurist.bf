-- ============================================================================
-- 0015 — Infrastructure IA : stockage des documents sources + mécanique de file
-- (claim/complete/fail, atomique, service_role UNIQUEMENT — jamais accessible
-- aux étudiants ni même aux content_admin via RLS directe).
-- ============================================================================
begin;

-- Bucket privé pour les documents sources (PDF/DOCX/TXT importés par l'admin).
insert into storage.buckets (id, name, public)
values ('source-documents', 'source-documents', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Réclamation atomique de jobs en attente (FOR UPDATE SKIP LOCKED) : plusieurs
-- workers concurrents ne se marchent jamais dessus. Restreint à service_role.
-- ---------------------------------------------------------------------------
create or replace function claim_jobs(p_types text[], p_limit int default 5)
returns setof jobs
language plpgsql
as $$
begin
  return query
    update jobs set status = 'running', attempts = attempts + 1, updated_at = now()
    where id in (
      select id from jobs
      where type = any(p_types)
        and status in ('pending', 'error')
        and run_after <= now()
      order by run_after
      limit p_limit
      for update skip locked
    )
    returning *;
end $$;

revoke all on function claim_jobs(text[], int) from public;
grant execute on function claim_jobs(text[], int) to service_role;

create or replace function complete_job(p_job_id uuid, p_result jsonb default null)
returns void language sql as $$
  update jobs set status = 'done', result = p_result, last_error = null, updated_at = now() where id = p_job_id;
$$;
revoke all on function complete_job(uuid, jsonb) from public;
grant execute on function complete_job(uuid, jsonb) to service_role;

-- Échec : backoff exponentiel (2^attempts minutes, plafonné à 60 min) ou DLQ si épuisé.
create or replace function fail_job(p_job_id uuid, p_error text)
returns void
language plpgsql
as $$
declare v_attempts int; v_max int;
begin
  select attempts, max_attempts into v_attempts, v_max from jobs where id = p_job_id;
  if v_attempts >= v_max then
    update jobs set status = 'dead', last_error = p_error, updated_at = now() where id = p_job_id;
  else
    update jobs set
      status = 'error',
      last_error = p_error,
      run_after = now() + (least(60, power(2, v_attempts))::text || ' minutes')::interval,
      updated_at = now()
    where id = p_job_id;
  end if;
end $$;

revoke all on function fail_job(uuid, text) from public;
grant execute on function fail_job(uuid, text) to service_role;

commit;
