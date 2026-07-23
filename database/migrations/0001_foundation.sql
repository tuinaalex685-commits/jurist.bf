-- ============================================================================
-- 0001 — Fondation : extensions, fonctions utilitaires, file de jobs (pgmq)
-- Jurist BF — migrations forward-only. Source de vérité du schéma (Git).
-- NB : ce fichier N'EST PAS appliqué automatiquement (nécessite un projet Supabase).
-- ============================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "ltree";       -- arbre de structure juridique
create extension if not exists "pg_trgm";     -- recherche floue (⌘K)
create extension if not exists "pgmq";        -- file d'attente transactionnelle

-- ---------------------------------------------------------------------------
-- Utilitaires
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Crée (si absente) la partition mensuelle d'une table partitionnée par RANGE.
create or replace function ensure_month_partition(p_parent text, p_from date)
returns void language plpgsql as $$
declare
  v_start date := date_trunc('month', p_from);
  v_end   date := (date_trunc('month', p_from) + interval '1 month');
  v_name  text := format('%s_%s', p_parent, to_char(v_start, 'YYYYMM'));
begin
  execute format(
    'create table if not exists %I partition of %I for values from (%L) to (%L)',
    v_name, p_parent, v_start, v_end
  );
end $$;

-- ---------------------------------------------------------------------------
-- Rôles : helpers d'autorisation (utilisés par la RLS — cf. 0008)
-- SECURITY DEFINER pour lire profiles sans récursion RLS.
-- ---------------------------------------------------------------------------
create or replace function current_role_level()
returns int language sql stable security definer set search_path = public as $$
  select case (select role from profiles where id = auth.uid())
    when 'admin' then 3
    when 'content_admin' then 2
    when 'student' then 1
    else 0
  end;
$$;

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from profiles where id = auth.uid()), false);
$$;

create or replace function is_content_admin()
returns boolean language sql stable set search_path = public as $$
  select current_role_level() >= 2;
$$;

-- ---------------------------------------------------------------------------
-- File d'attente unifiée : `jobs` (source de vérité / observabilité) + pgmq (livraison)
-- ---------------------------------------------------------------------------
create table if not exists jobs (
  id              uuid primary key default gen_random_uuid(),
  type            text not null,
  payload         jsonb not null default '{}'::jsonb,
  status          text not null default 'pending'
                    check (status in ('pending','running','done','error','dead')),
  attempts        int not null default 0,
  max_attempts    int not null default 5,
  idempotency_key text,
  run_after       timestamptz not null default now(),
  last_error      text,
  result          jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index if not exists jobs_idempotency_uidx
  on jobs (idempotency_key) where idempotency_key is not null;
create index if not exists jobs_status_run_after_idx
  on jobs (status, run_after) where status in ('pending','error');

create trigger jobs_set_updated_at before update on jobs
  for each row execute function set_updated_at();

-- Crée la file pgmq (idempotent).
do $$ begin
  perform pgmq.create('jbf_jobs');
exception when others then null;
end $$;

-- Enfilement transactionnel + idempotent : insère la ligne `jobs` puis envoie dans pgmq.
-- Retourne le msg_id pgmq, ou NULL si le job existait déjà (idempotence).
create or replace function enqueue_job(
  p_queue text,
  p_type text,
  p_payload jsonb,
  p_idempotency_key text default null,
  p_run_after timestamptz default null
) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_job_id uuid;
  v_msg_id bigint;
begin
  insert into jobs (type, payload, idempotency_key, run_after)
  values (p_type, coalesce(p_payload, '{}'::jsonb), p_idempotency_key, coalesce(p_run_after, now()))
  on conflict (idempotency_key) where idempotency_key is not null do nothing
  returning id into v_job_id;

  if v_job_id is null then
    return null;  -- déjà enfilé
  end if;

  select pgmq.send('jbf_jobs', jsonb_build_object('job_id', v_job_id, 'type', p_type)) into v_msg_id;
  return v_msg_id;
end $$;
