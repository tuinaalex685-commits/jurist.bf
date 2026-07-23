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
