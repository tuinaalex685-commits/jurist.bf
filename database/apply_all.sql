-- Jurist BF — bundle d'application (migrations 0001→0008 + seed). Généré, ne pas éditer à la main.
-- À exécuter dans Supabase → SQL Editor (une seule fois).
begin;

-- ====== migrations/0001_foundation.sql ======
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

-- NB : les helpers de rôle (current_role_level / is_admin / is_content_admin) sont définis
-- en 0008, APRÈS la création de `profiles` — une fonction LANGUAGE sql valide son corps
-- (et ses références de tables) dès sa création.

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

-- ====== migrations/0002_identity_catalog.sql ======
-- ============================================================================
-- 0002 — Identité & tenancy + Référentiel juridique (arbre flexible)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tenancy
-- ---------------------------------------------------------------------------
create table if not exists organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  country_id uuid,                          -- FK ajoutée après countries
  type       text,                          -- 'universite' | 'ecole' | ...
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         text not null default 'student'
                 check (role in ('student','content_admin','admin')),
  display_name text,
  org_id       uuid references organizations(id) on delete set null,
  locale       text not null default 'fr',
  suspended_at timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists org_members (
  org_id       uuid not null references organizations(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role_in_org  text not null default 'member',
  created_at   timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- Référentiels de gamification
create table if not exists ranks (
  level         int primary key,             -- 1..5
  name          text not null,               -- Néophyte → Maître
  xp_threshold  int not null
);

create table if not exists badges (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  description text,
  condition   jsonb not null default '{}'::jsonb,
  icon        text
);

-- ---------------------------------------------------------------------------
-- Référentiel juridique : Pays → Code → (arbre) → Article → Version
-- ---------------------------------------------------------------------------
create table if not exists countries (
  id         uuid primary key default gen_random_uuid(),
  iso        text not null unique,           -- 'BF'
  name       text not null,
  created_at timestamptz not null default now()
);

alter table organizations
  drop constraint if exists organizations_country_fk,
  add constraint organizations_country_fk
    foreign key (country_id) references countries(id) on delete set null;

create table if not exists legal_codes (
  id          uuid primary key default gen_random_uuid(),
  country_id  uuid not null references countries(id) on delete cascade,
  name        text not null,                 -- 'Code pénal burkinabè'
  type        text,                          -- 'penal' | 'civil' | ...
  description text,
  position    int not null default 0,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (country_id, name)
);

-- Arbre générique de structure (Livre/Titre/Chapitre/Section/Sous-section) — profondeur libre.
create table if not exists structure_nodes (
  id         uuid primary key default gen_random_uuid(),
  code_id    uuid not null references legal_codes(id) on delete cascade,
  parent_id  uuid references structure_nodes(id) on delete cascade,
  type       text not null check (type in ('livre','titre','chapitre','section','sous_section')),
  label      text not null,
  number     text,
  position   int not null default 0,
  path       ltree,                          -- chemin matérialisé (requêtes de sous-arbre)
  created_at timestamptz not null default now()
);

create table if not exists articles (
  id                 uuid primary key default gen_random_uuid(),
  code_id            uuid not null references legal_codes(id) on delete cascade,
  node_id            uuid references structure_nodes(id) on delete set null,
  number             text not null,          -- '613-1'
  title              text,
  position           int not null default 0,
  difficulty         text check (difficulty in ('simple','intermediaire','complexe','piege')),
  estimated_minutes  int,
  current_version_id uuid,                    -- FK ajoutée après article_versions
  archived_at        timestamptz,
  created_at         timestamptz not null default now(),
  unique (code_id, number)
);

-- Versions de contenu : une version publiée est IMMUABLE ; la progression y référence.
create table if not exists article_versions (
  id            uuid primary key default gen_random_uuid(),
  article_id    uuid not null references articles(id) on delete cascade,
  version_no    int not null,
  official_text text not null,
  text_hash     text not null,               -- sha256(official_text) — diff & régénération ciblée
  status        text not null default 'draft'
                  check (status in ('draft','in_review','published','archived')),
  created_by    uuid references auth.users(id) on delete set null,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (article_id, version_no)
);

alter table articles
  drop constraint if exists articles_current_version_fk,
  add constraint articles_current_version_fk
    foreign key (current_version_id) references article_versions(id) on delete set null;

-- ====== migrations/0003_content_studio.sql ======
-- ============================================================================
-- 0003 — Contenu pédagogique généré (par version) + Content Studio admin
-- Statuts de contenu : draft → validated → published (rien montré avant published).
-- ============================================================================

-- Narratif de la notion (Phase 0), attaché à la version d'article.
create table if not exists article_pedagogy (
  article_version_id uuid primary key references article_versions(id) on delete cascade,
  intro     text,
  why       text,
  protects  text,
  outcomes  jsonb not null default '[]'::jsonb,
  status    text not null default 'draft' check (status in ('draft','validated','published'))
);

-- Phase 1 — Reconnaissance (dossiers, dont cas pièges)
create table if not exists situations (
  id                 uuid primary key default gen_random_uuid(),
  article_version_id uuid not null references article_versions(id) on delete cascade,
  level       text not null check (level in ('simple','intermediaire','complexe','piege')),
  scenario    text not null,
  context     text,
  characters  jsonb not null default '[]'::jsonb,
  key_facts   jsonb not null default '[]'::jsonb,
  question    text not null,
  answer      text not null,
  explanation text,
  status      text not null default 'draft' check (status in ('draft','validated','published')),
  position    int not null default 0
);

-- Phase 2 — Compréhension (blocs)
create table if not exists comprehension_blocks (
  id                 uuid primary key default gen_random_uuid(),
  article_version_id uuid not null references article_versions(id) on delete cascade,
  type    text not null check (type in
            ('elements','conditions','limites','exceptions','distinction','contre_exemple')),
  content text not null,
  status  text not null default 'draft' check (status in ('draft','validated','published')),
  position int not null default 0
);

-- Phase 3 — Mémorisation (texte à trous)
create table if not exists memorization_items (
  id                 uuid primary key default gen_random_uuid(),
  article_version_id uuid not null references article_versions(id) on delete cascade,
  cloze_template text not null,
  blanks         jsonb not null default '[]'::jsonb,
  level          int not null default 1,
  status         text not null default 'draft' check (status in ('draft','validated','published')),
  position       int not null default 0
);

-- Flashcards
create table if not exists flashcards (
  id                 uuid primary key default gen_random_uuid(),
  article_version_id uuid not null references article_versions(id) on delete cascade,
  front  text not null,
  back   text not null,
  status text not null default 'draft' check (status in ('draft','validated','published')),
  position int not null default 0
);

-- Banque de questions d'examen (mutualisée)
create table if not exists exam_questions_bank (
  id                 uuid primary key default gen_random_uuid(),
  article_version_id uuid not null references article_versions(id) on delete cascade,
  type       text not null,                  -- 'qcm' | 'vrai_faux' | 'cas' | ...
  payload    jsonb not null,                 -- énoncé + options + corrigé
  difficulty text check (difficulty in ('simple','intermediaire','complexe','piege')),
  status     text not null default 'draft' check (status in ('draft','validated','published'))
);

-- ---------------------------------------------------------------------------
-- Content Studio : import de documents + prompt maître + lots de génération
-- ---------------------------------------------------------------------------
create table if not exists source_documents (
  id           uuid primary key default gen_random_uuid(),
  code_id      uuid references legal_codes(id) on delete set null,
  filename     text not null,
  mime         text not null,
  storage_path text not null,
  checksum     text not null,
  status       text not null default 'uploaded'
                 check (status in ('uploaded','parsing','parsed','failed')),
  uploaded_by  uuid references auth.users(id) on delete set null,
  meta         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

-- Prompt Maître : SOURCE UNIQUE, versionnée. Un seul actif par `key`.
create table if not exists prompt_templates (
  id         uuid primary key default gen_random_uuid(),
  key        text not null,                  -- 'master'
  version    int not null,
  body       text not null,
  variables  jsonb not null default '{}'::jsonb,
  model      text,
  params     jsonb not null default '{}'::jsonb,
  is_active  boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (key, version)
);
-- Au plus un template actif par clé.
create unique index if not exists prompt_templates_active_uidx
  on prompt_templates (key) where is_active;

-- Suivi d'un lot de génération (portée article/section/chapitre/code) pour le cockpit.
create table if not exists generation_batches (
  id           uuid primary key default gen_random_uuid(),
  scope        jsonb not null,               -- {kind:'code'|'node'|'article', id:...}
  requested_by uuid references auth.users(id) on delete set null,
  total        int not null default 0,
  done         int not null default 0,
  failed       int not null default 0,
  status       text not null default 'running' check (status in ('running','done','failed')),
  created_at   timestamptz not null default now()
);

-- ====== migrations/0004_learning_gamification_srs.sql ======
-- ============================================================================
-- 0004 — Progression, gamification, révision espacée (SRS)
-- Tables chaudes partitionnées par mois : attempts, review_logs.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Progression
-- ---------------------------------------------------------------------------
create table if not exists user_article_progress (
  user_id            uuid not null references auth.users(id) on delete cascade,
  article_id         uuid not null references articles(id) on delete cascade,
  article_version_id uuid references article_versions(id) on delete set null,
  status             text not null default 'in_progress'
                       check (status in ('not_started','in_progress','mastered')),
  mastery_score      numeric not null default 0,
  current_phase      int not null default 0,
  started_at         timestamptz,
  mastered_at        timestamptz,
  updated_at         timestamptz not null default now(),
  primary key (user_id, article_id)
);
create trigger uap_set_updated_at before update on user_article_progress
  for each row execute function set_updated_at();

create table if not exists user_phase_progress (
  user_id            uuid not null references auth.users(id) on delete cascade,
  article_version_id uuid not null references article_versions(id) on delete cascade,
  phase              int not null,
  status             text not null default 'in_progress'
                       check (status in ('in_progress','completed')),
  score              numeric,
  completed_at       timestamptz,
  primary key (user_id, article_version_id, phase)
);

-- Tentatives — volumineux → partitionné par mois (PK inclut la clé de partition).
create table if not exists attempts (
  id         uuid not null default gen_random_uuid(),
  user_id    uuid not null,
  item_type  text not null check (item_type in ('situation','comprehension','memorization','exam_question')),
  item_id    uuid not null,
  correct    boolean,
  payload    jsonb,
  created_at timestamptz not null default now(),
  primary key (id, created_at)
) partition by range (created_at);
create table if not exists attempts_default partition of attempts default;
select ensure_month_partition('attempts', current_date);
select ensure_month_partition('attempts', (current_date + interval '1 month')::date);

-- ---------------------------------------------------------------------------
-- Gamification
-- ---------------------------------------------------------------------------
create table if not exists xp_ledger (            -- append-only
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  delta      int not null,
  reason     text not null,
  ref_type   text,
  ref_id     uuid,
  created_at timestamptz not null default now()
);

create table if not exists user_badges (
  user_id   uuid not null references auth.users(id) on delete cascade,
  badge_id  uuid not null references badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create table if not exists seals (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  article_id         uuid not null references articles(id) on delete cascade,
  article_version_id uuid references article_versions(id) on delete set null,
  earned_at          timestamptz not null default now(),
  unique (user_id, article_id)
);

-- Agrégat maintenu (lecture O(1) pour le Dashboard).
create table if not exists user_stats (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  xp_total       int not null default 0,
  rank_level     int not null default 1,
  streak_days    int not null default 0,
  last_active_on date,
  mastered_count int not null default 0,
  updated_at     timestamptz not null default now()
);
create trigger user_stats_set_updated_at before update on user_stats
  for each row execute function set_updated_at();

-- Provisionnement automatique du profil + stats à l'inscription.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  insert into public.user_stats (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Révision espacée (SRS)
-- ---------------------------------------------------------------------------
create table if not exists srs_cards (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  article_id       uuid not null references articles(id) on delete cascade,
  item_ref         text,
  ease             numeric not null default 2.5,
  interval_days    int not null default 0,
  reps             int not null default 0,
  lapses           int not null default 0,
  state            text not null default 'fragile'
                     check (state in ('urgent','fragile','correct','mastered','anchored')),
  due_at           timestamptz not null default now(),
  last_reviewed_at timestamptz,
  unique (user_id, article_id, item_ref)
);

create table if not exists review_logs (         -- append-only, partitionné
  id            uuid not null default gen_random_uuid(),
  user_id       uuid not null,
  card_id       uuid not null,
  grade         int not null,
  prev_interval int,
  next_interval int,
  reviewed_at   timestamptz not null default now(),
  primary key (id, reviewed_at)
) partition by range (reviewed_at);
create table if not exists review_logs_default partition of review_logs default;
select ensure_month_partition('review_logs', current_date);
select ensure_month_partition('review_logs', (current_date + interval '1 month')::date);

-- ====== migrations/0005_exams_engagement.sql ======
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

-- ====== migrations/0006_ai_observability.sql ======
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

-- ====== migrations/0007_indexes.sql ======
-- ============================================================================
-- 0007 — Index (composites, partiels, recherche floue). FK indexées.
-- ============================================================================

-- Catalogue
create index if not exists legal_codes_country_idx on legal_codes (country_id);
create index if not exists structure_nodes_code_idx on structure_nodes (code_id);
create index if not exists structure_nodes_parent_idx on structure_nodes (parent_id);
create index if not exists structure_nodes_path_gist on structure_nodes using gist (path);
create index if not exists articles_code_idx on articles (code_id);
create index if not exists articles_node_idx on articles (node_id);
create index if not exists article_versions_article_idx on article_versions (article_id);
-- Contenu servi = published uniquement (index partiel)
create index if not exists article_versions_published_idx
  on article_versions (article_id) where status = 'published';

-- Recherche ⌘K (numéro/titre + texte officiel)
create index if not exists articles_number_trgm on articles using gin (number gin_trgm_ops);
create index if not exists articles_title_trgm on articles using gin (title gin_trgm_ops);
create index if not exists article_versions_text_trgm
  on article_versions using gin (official_text gin_trgm_ops);

-- Contenu pédagogique par version
create index if not exists situations_version_idx on situations (article_version_id);
create index if not exists comprehension_version_idx on comprehension_blocks (article_version_id);
create index if not exists memorization_version_idx on memorization_items (article_version_id);
create index if not exists flashcards_version_idx on flashcards (article_version_id);
create index if not exists examqbank_version_idx on exam_questions_bank (article_version_id);

-- Progression / dashboard / biblio
create index if not exists uap_user_status_idx on user_article_progress (user_id, status);
create index if not exists seals_user_idx on seals (user_id, earned_at desc);
create index if not exists xp_ledger_user_idx on xp_ledger (user_id, created_at desc);

-- SRS — la séance du jour
create index if not exists srs_due_idx on srs_cards (user_id, due_at);

-- Examens
create index if not exists exam_sessions_user_idx on exam_sessions (user_id, started_at desc);
create index if not exists esq_session_idx on exam_session_questions (session_id);

-- Notifications
create index if not exists notifications_user_unread_idx
  on notifications (user_id, created_at desc) where read_at is null;

-- Accès
create index if not exists access_codes_unused_idx
  on access_codes (batch_id) where status = 'unused';
create index if not exists subscriptions_user_idx on subscriptions (user_id, status);

-- IA & analytics
create index if not exists ai_usage_created_idx on ai_usage (created_at);
create index if not exists ai_usage_user_idx on ai_usage (user_id, created_at);
create index if not exists ai_generations_version_idx on ai_generations (source_version_id);
create index if not exists analytics_events_name_idx on analytics_events (name, occurred_at);
create index if not exists audit_logs_actor_idx on audit_logs (actor_id, created_at desc);

-- Jobs / file
create index if not exists jobs_type_idx on jobs (type, created_at desc);

-- ====== migrations/0008_rls.sql ======
-- ============================================================================
-- 0008 — Row Level Security (deny-by-default + politiques)
-- RLS activée partout. `service_role` (workers/admin serveur) contourne la RLS.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helpers de rôle (définis ici car ils référencent `profiles`).
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

-- Activer RLS sur toutes les tables applicatives
do $$
declare t text;
begin
  foreach t in array array[
    'organizations','profiles','org_members','ranks','badges',
    'countries','legal_codes','structure_nodes','articles','article_versions',
    'article_pedagogy','situations','comprehension_blocks','memorization_items','flashcards','exam_questions_bank',
    'source_documents','prompt_templates','generation_batches',
    'user_article_progress','user_phase_progress','attempts',
    'xp_ledger','user_badges','seals','user_stats',
    'srs_cards','review_logs',
    'exams','exam_sessions','exam_session_questions',
    'notifications','access_code_batches','access_codes','subscriptions','invoices',
    'ai_generations','ai_usage','ai_budget_config','audit_logs','analytics_events','jobs'
  ] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- --- Profils ---
create policy profiles_self_select on profiles for select using (id = auth.uid() or is_admin());
create policy profiles_self_update on profiles for update using (id = auth.uid());
create policy profiles_admin_all on profiles for all using (is_admin()) with check (is_admin());

-- --- Tenancy ---
create policy orgs_read on organizations for select using (auth.uid() is not null);
create policy orgs_admin on organizations for all using (is_admin()) with check (is_admin());
create policy orgmembers_self on org_members for select using (user_id = auth.uid() or is_admin());
create policy orgmembers_admin on org_members for all using (is_admin()) with check (is_admin());

-- --- Référentiels lisibles par tout authentifié ; écriture content_admin+ ---
do $$
declare t text;
begin
  foreach t in array array['ranks','badges','countries','legal_codes','structure_nodes','articles'] loop
    execute format('create policy %1$s_read on %1$s for select using (auth.uid() is not null);', t);
    execute format('create policy %1$s_write on %1$s for all using (is_content_admin()) with check (is_content_admin());', t);
  end loop;
end $$;

-- --- Versions & contenu pédagogique : lecture si published, sinon content_admin ---
create policy av_read on article_versions for select
  using (status = 'published' or is_content_admin());
create policy av_write on article_versions for all
  using (is_content_admin()) with check (is_content_admin());

do $$
declare t text;
begin
  foreach t in array array['article_pedagogy','situations','comprehension_blocks','memorization_items','flashcards','exam_questions_bank'] loop
    execute format($f$create policy %1$s_read on %1$s for select using (status = 'published' or is_content_admin());$f$, t);
    execute format('create policy %1$s_write on %1$s for all using (is_content_admin()) with check (is_content_admin());', t);
  end loop;
end $$;

-- --- Content Studio : content_admin/admin uniquement ---
do $$
declare t text;
begin
  foreach t in array array['source_documents','prompt_templates','generation_batches'] loop
    execute format('create policy %1$s_admin on %1$s for all using (is_content_admin()) with check (is_content_admin());', t);
  end loop;
end $$;

-- --- Données utilisateur (scopées user_id = auth.uid()) ---
do $$
declare t text;
begin
  foreach t in array array[
    'user_article_progress','user_phase_progress','attempts','xp_ledger','user_badges',
    'seals','user_stats','srs_cards','review_logs','notifications','subscriptions'
  ] loop
    execute format($f$create policy %1$s_own on %1$s for all
      using (user_id = auth.uid()) with check (user_id = auth.uid());$f$, t);
    execute format('create policy %1$s_admin on %1$s for select using (is_admin());', t);
  end loop;
end $$;

-- Invoices : propre lecture + admin
create policy invoices_own on invoices for select using (user_id = auth.uid() or is_admin());

-- --- Examens ---
create policy exams_read on exams for select using (status = 'published' or is_content_admin());
create policy exams_write on exams for all using (is_content_admin()) with check (is_content_admin());
create policy exam_sessions_own on exam_sessions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy exam_sessions_admin on exam_sessions for select using (is_admin());
create policy esq_own on exam_session_questions for all
  using (exists (select 1 from exam_sessions s where s.id = session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from exam_sessions s where s.id = session_id and s.user_id = auth.uid()));

-- --- Tables internes/business : admin only (service_role contourne pour les workers) ---
do $$
declare t text;
begin
  foreach t in array array['access_code_batches','access_codes','ai_generations','ai_usage','ai_budget_config','audit_logs','analytics_events','jobs'] loop
    execute format('create policy %1$s_admin on %1$s for all using (is_admin()) with check (is_admin());', t);
  end loop;
end $$;

-- ====== seed/seed.sql ======
-- ============================================================================
-- Seed — données de référence + jeu de démonstration (idempotent).
-- À exécuter après les migrations 0001→0008.
-- ============================================================================

-- Pays
insert into countries (id, iso, name) values
  ('11111111-1111-1111-1111-111111111111', 'BF', 'Burkina Faso')
on conflict (iso) do nothing;

-- Rangs (les 5 grades de l'Académie)
insert into ranks (level, name, xp_threshold) values
  (1, 'Néophyte', 0),
  (2, 'Initié', 500),
  (3, 'Praticien', 1500),
  (4, 'Plaideur', 3500),
  (5, 'Maître', 7000)
on conflict (level) do nothing;

-- Badges / distinctions
insert into badges (code, name, description, condition) values
  ('first_seal', 'Premier Sceau', 'Premier article maîtrisé', '{"seals": 1}'),
  ('ten_articles', 'Dix Articles', '10 articles maîtrisés', '{"seals": 10}'),
  ('perfect_memo', 'Mémoire Parfaite', 'Mémorisation sans faute', '{"perfect_memorization": true}'),
  ('exam_ace', 'Sans Faute', 'Examen réussi sans erreur', '{"perfect_exam": true}'),
  ('streak_30', 'Assidu', '30 jours de série', '{"streak_days": 30}')
on conflict (code) do nothing;

-- Prompt Maître (placeholder — sera édité depuis le cockpit)
insert into prompt_templates (key, version, body, is_active, model)
values (
  'master', 1,
  'Tu es le concepteur pédagogique de Jurist BF. À partir du TEXTE OFFICIEL d''un article de loi '
  || 'et de sa notion, produis un contenu strictement fidèle au droit (jamais d''invention) : '
  || 'introduction, pourquoi la règle existe, ce qu''elle protège, situations pratiques (dont cas pièges), '
  || 'explications, exceptions, mémorisation (texte à trous), flashcards, questions et corrigés. '
  || 'Réponds en JSON structuré.',
  true, 'gemini-2.0-flash'
)
on conflict (key, version) do nothing;

-- --- Jeu de démonstration : Code pénal BF → article 613-1 (abus de confiance) ---
insert into legal_codes (id, country_id, name, type, description) values
  ('22222222-2222-2222-2222-222222222222',
   '11111111-1111-1111-1111-111111111111',
   'Code pénal burkinabè', 'penal',
   'Loi N° 025-2018/AN portant Code pénal du Burkina Faso.')
on conflict (id) do nothing;

insert into structure_nodes (id, code_id, parent_id, type, label, number, path) values
  ('33333333-3333-3333-3333-333333333333',
   '22222222-2222-2222-2222-222222222222', null,
   'livre', 'Des atteintes aux biens', 'III', 'l3')
on conflict (id) do nothing;

insert into articles (id, code_id, node_id, number, title, difficulty, estimated_minutes) values
  ('44444444-4444-4444-4444-444444444444',
   '22222222-2222-2222-2222-222222222222',
   '33333333-3333-3333-3333-333333333333',
   '613-1', 'De l''abus de confiance', 'intermediaire', 15)
on conflict (id) do nothing;

insert into article_versions (id, article_id, version_no, official_text, text_hash, status, published_at) values
  ('55555555-5555-5555-5555-555555555555',
   '44444444-4444-4444-4444-444444444444', 1,
   'L''abus de confiance est le fait par une personne de détourner, au préjudice d''autrui, des fonds, des valeurs ou un bien quelconque qui lui ont été remis et qu''elle a acceptés à charge de les rendre, de les représenter ou d''en faire un usage ou un emploi déterminé.',
   'seed-hash-613-1-v1', 'published', now())
on conflict (id) do nothing;

update articles
  set current_version_id = '55555555-5555-5555-5555-555555555555'
  where id = '44444444-4444-4444-4444-444444444444'
    and current_version_id is null;

commit;
