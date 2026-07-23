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
