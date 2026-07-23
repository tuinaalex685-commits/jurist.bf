-- ============================================================================
-- 0006 — IA (génération/cache/coût) + Observabilité (audit, analytics)
-- ============================================================================

-- Cache PARTAGÉ des générations : dédup par input_hash → « jamais deux fois ».
create table if not exists ai_generations (
  id                uuid primary key default gen_random_uuid(),
  content_type      text not null,           -- 'situations' | 'comprehension' | ...
  source_version_id uuid references article_versions(id) on delete set null,
  prompt_version    int,
  params_hash       text,
  input_hash        text not null unique,     -- sha256(prompt_master_version + text_hash + spec)
  model             text,
  output            jsonb not null,
  tokens_in         int not null default 0,
  tokens_out        int not null default 0,
  cost_usd          numeric not null default 0,
  created_at        timestamptz not null default now()
);

-- Consommation IA (coût par utilisateur / fonctionnalité / code) — cockpit.
create table if not exists ai_usage (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  code_id    uuid references legal_codes(id) on delete set null,
  feature    text not null,
  tokens_in  int not null default 0,
  tokens_out int not null default 0,
  cost_usd   numeric not null default 0,
  cache_hit  boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Audit & analytics (append-only). analytics_events partitionné par mois.
-- ---------------------------------------------------------------------------
create table if not exists audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references auth.users(id) on delete set null,
  actor_role  text,
  action      text not null,
  target_type text,
  target_id   uuid,
  meta        jsonb not null default '{}'::jsonb,
  ip          inet,
  created_at  timestamptz not null default now()
);

create table if not exists analytics_events (
  id          uuid not null default gen_random_uuid(),
  user_id     uuid,
  org_id      uuid,
  name        text not null,
  props       jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  primary key (id, occurred_at)
) partition by range (occurred_at);
create table if not exists analytics_events_default partition of analytics_events default;
select ensure_month_partition('analytics_events', current_date);
select ensure_month_partition('analytics_events', (current_date + interval '1 month')::date);

-- Configuration IA (budgets & coupe-circuit) — pilotée depuis le cockpit.
create table if not exists ai_budget_config (
  id              int primary key default 1 check (id = 1),
  monthly_usd     numeric not null default 50,
  daily_usd       numeric not null default 5,
  circuit_open    boolean not null default false,  -- true = générations suspendues
  updated_at      timestamptz not null default now()
);
insert into ai_budget_config (id) values (1) on conflict (id) do nothing;
