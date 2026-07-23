-- ============================================================================
-- 0005 — Examens, notifications, accès & abonnements
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Examens (« L'Épreuve »)
-- ---------------------------------------------------------------------------
create table if not exists exams (
  id               uuid primary key default gen_random_uuid(),
  scope            jsonb not null,            -- {code_id?, node_id?, level?}
  title            text not null,
  difficulty       text,
  duration_seconds int not null default 1200,
  pass_threshold   numeric not null default 0.6,
  reward           jsonb not null default '{}'::jsonb,
  status           text not null default 'draft' check (status in ('draft','published','archived')),
  created_at       timestamptz not null default now()
);

create table if not exists exam_sessions (
  id           uuid primary key default gen_random_uuid(),
  exam_id      uuid not null references exams(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  started_at   timestamptz not null default now(),
  submitted_at timestamptz,
  time_spent_s int,
  score        numeric,
  passed       boolean,
  breakdown    jsonb,                         -- forts/faibles, questions problématiques
  idempotency_key text unique                 -- démarrage idempotent
);

create table if not exists exam_session_questions (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references exam_sessions(id) on delete cascade,
  question_id  uuid not null references exam_questions_bank(id) on delete cascade,
  given_answer jsonb,
  correct      boolean,
  time_ms      int
);

-- ---------------------------------------------------------------------------
-- Notifications (« convocations du maître ») — realtime possible via Supabase
-- ---------------------------------------------------------------------------
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  data       jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Codes d'accès (packaging de distribution) & abonnements (facturation)
-- ---------------------------------------------------------------------------
create table if not exists access_code_batches (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid references organizations(id) on delete set null,
  label      text not null,
  plan       text not null default 'standard',
  quantity   int not null default 0,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists access_codes (
  id          uuid primary key default gen_random_uuid(),
  batch_id    uuid not null references access_code_batches(id) on delete cascade,
  code_hash   text not null unique,          -- le code n'est JAMAIS stocké en clair
  status      text not null default 'unused'
                check (status in ('unused','active','revoked','expired')),
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  plan               text not null,
  status             text not null default 'active'
                       check (status in ('active','past_due','canceled','trialing')),
  current_period_end timestamptz,
  provider_ref       text,
  created_at         timestamptz not null default now()
);

create table if not exists invoices (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,
  amount_cents int not null,
  currency     text not null default 'XOF',
  status       text not null default 'paid',
  provider_ref text,
  issued_at    timestamptz not null default now()
);
