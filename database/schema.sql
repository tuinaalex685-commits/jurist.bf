-- ============================================================================
-- Jurist BF — Schéma de base de données (v0, MVP)
-- Cible : Supabase / PostgreSQL.
-- À appliquer plus tard (scaffold local d'abord). Idempotent autant que possible.
--
-- Principe : Pays → Code juridique → Notion → Article → Contenu pédagogique.
-- Le contenu pédagogique est généré par l'IA en `draft`, validé par l'admin,
-- puis `published`. Rien n'est visible par l'apprenant avant `published`.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 0. Profils & rôles
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'student' check (role in ('student', 'admin')),
  display_name text,
  created_at  timestamptz not null default now()
);

-- Helper : l'utilisateur courant est-il admin ?
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- 1. Base juridique (référentiel, contrôlé par l'admin)
-- ---------------------------------------------------------------------------
create table if not exists countries (
  id         uuid primary key default gen_random_uuid(),
  iso        text not null unique,           -- ex : 'BF'
  name       text not null,                  -- ex : 'Burkina Faso'
  created_at timestamptz not null default now()
);

create table if not exists legal_codes (
  id          uuid primary key default gen_random_uuid(),
  country_id  uuid not null references countries(id) on delete cascade,
  name        text not null,                 -- ex : 'Code civil burkinabè'
  type        text,                          -- ex : 'civil', 'penal'
  description text,
  created_at  timestamptz not null default now(),
  unique (country_id, name)
);

create table if not exists notions (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,           -- ex : 'abus-de-confiance'
  name       text not null,                  -- ex : 'Abus de confiance'
  intro      text,                           -- Phase 0 : introduction de la notion
  created_at timestamptz not null default now()
);

create table if not exists articles (
  id            uuid primary key default gen_random_uuid(),
  code_id       uuid not null references legal_codes(id) on delete cascade,
  notion_id     uuid references notions(id) on delete set null,
  number        text not null,               -- ex : '1', '408'
  title         text,
  official_text text not null,               -- texte officiel exact = source de vérité
  position      int not null default 0,      -- ordre d'affichage
  created_at    timestamptz not null default now(),
  unique (code_id, number)
);

-- ---------------------------------------------------------------------------
-- 2. Contenu pédagogique (généré par IA -> validé -> publié)
-- ---------------------------------------------------------------------------
-- status : 'draft' | 'validated' | 'published'

-- Phase 1 — Reconnaissance par situations
create table if not exists situations (
  id           uuid primary key default gen_random_uuid(),
  article_id   uuid not null references articles(id) on delete cascade,
  level        text not null check (level in ('simple','intermediaire','complexe','piege')),
  scenario     text not null,
  question     text not null,
  answer       text not null,                -- bonne réponse attendue
  explanation  text,
  status       text not null default 'draft' check (status in ('draft','validated','published')),
  position     int not null default 0,
  created_at   timestamptz not null default now()
);

-- Phase 2 — Association / compréhension
create table if not exists comprehension_blocks (
  id          uuid primary key default gen_random_uuid(),
  article_id  uuid not null references articles(id) on delete cascade,
  type        text not null check (type in
                ('elements','conditions','limites','exceptions','distinction','contre_exemple')),
  content     text not null,
  status      text not null default 'draft' check (status in ('draft','validated','published')),
  position    int not null default 0,
  created_at  timestamptz not null default now()
);

-- Phase 3 — Ancrage / mémorisation
create table if not exists memorization_items (
  id             uuid primary key default gen_random_uuid(),
  article_id     uuid not null references articles(id) on delete cascade,
  cloze_template text not null,              -- texte avec trous, ex : "L'{{abus}} de {{confiance}} est..."
  blanks         jsonb not null default '[]'::jsonb,
  level          int not null default 1,     -- difficulté progressive
  status         text not null default 'draft' check (status in ('draft','validated','published')),
  position       int not null default 0,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. Progression & mémorisation espacée (par utilisateur)
-- ---------------------------------------------------------------------------
create table if not exists user_article_progress (
  user_id        uuid not null references auth.users(id) on delete cascade,
  article_id     uuid not null references articles(id) on delete cascade,
  current_phase  int not null default 0,     -- 0..4
  status         text not null default 'in_progress'
                   check (status in ('not_started','in_progress','mastered')),
  mastery_score  numeric not null default 0, -- 0..1
  last_seen_at   timestamptz,
  primary key (user_id, article_id)
);

create table if not exists user_attempts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  item_id    uuid not null,                  -- polymorphe : situation / bloc / mémo
  item_type  text not null check (item_type in ('situation','comprehension','memorization')),
  correct    boolean,
  payload    jsonb,
  created_at timestamptz not null default now()
);

create table if not exists srs_cards (
  user_id    uuid not null references auth.users(id) on delete cascade,
  item_id    uuid not null,
  item_type  text not null check (item_type in ('situation','comprehension','memorization','article')),
  ease       numeric not null default 2.5,
  interval   int not null default 0,         -- jours
  due_at     timestamptz not null default now(),
  primary key (user_id, item_id, item_type)
);

create table if not exists synthese_exams (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  article_ids uuid[] not null default '{}',
  score       numeric,
  results     jsonb,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. Pipeline de génération IA (asynchrone)
-- ---------------------------------------------------------------------------
create table if not exists ai_jobs (
  id         uuid primary key default gen_random_uuid(),
  type       text not null,                  -- ex : 'generate_situations'
  payload    jsonb not null default '{}'::jsonb,
  status     text not null default 'pending'
               check (status in ('pending','running','done','error')),
  result     jsonb,
  error      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 5. Row Level Security
-- ---------------------------------------------------------------------------
alter table profiles              enable row level security;
alter table countries             enable row level security;
alter table legal_codes           enable row level security;
alter table notions               enable row level security;
alter table articles              enable row level security;
alter table situations            enable row level security;
alter table comprehension_blocks  enable row level security;
alter table memorization_items    enable row level security;
alter table user_article_progress enable row level security;
alter table user_attempts         enable row level security;
alter table srs_cards             enable row level security;
alter table synthese_exams        enable row level security;
alter table ai_jobs               enable row level security;

-- Profils : chacun voit/édite le sien ; l'admin voit tout.
create policy profiles_self_select on profiles for select
  using (id = auth.uid() or is_admin());
create policy profiles_self_update on profiles for update
  using (id = auth.uid());

-- Référentiel juridique : lecture pour tout utilisateur authentifié ; écriture admin only.
do $$
declare t text;
begin
  foreach t in array array['countries','legal_codes','notions','articles'] loop
    execute format('create policy %I_read on %I for select using (auth.uid() is not null);', t, t);
    execute format('create policy %I_write on %I for all using (is_admin()) with check (is_admin());', t, t);
  end loop;
end $$;

-- Contenu pédagogique : l'apprenant ne voit que le `published` ; l'admin voit et écrit tout.
do $$
declare t text;
begin
  foreach t in array array['situations','comprehension_blocks','memorization_items'] loop
    execute format($f$create policy %I_read on %I for select
      using (status = 'published' or is_admin());$f$, t, t);
    execute format('create policy %I_write on %I for all using (is_admin()) with check (is_admin());', t, t);
  end loop;
end $$;

-- Données utilisateur : chacun n'accède qu'aux siennes.
do $$
declare t text;
begin
  foreach t in array array['user_article_progress','user_attempts','srs_cards','synthese_exams'] loop
    execute format($f$create policy %I_own on %I for all
      using (user_id = auth.uid()) with check (user_id = auth.uid());$f$, t, t);
  end loop;
end $$;

-- Jobs IA : admin only (déclenchés par l'admin, exécutés par un worker à clé service).
create policy ai_jobs_admin on ai_jobs for all using (is_admin()) with check (is_admin());
