-- ============================================================================
-- 0010 — Moteur par ACTIVITÉS pédagogiques (remplace le modèle par phase figé)
-- Article → Version → Phase (conteneur) → Activités (polymorphes).
-- Le PROMPT (affiché) est séparé de la SOLUTION (clé de correction, secrète) →
-- sécurité au niveau colonne via 2 tables (RLS ne filtre que par ligne).
-- ============================================================================
begin;

-- Activités : contenu PUBLIC (ce que le frontend affiche). `type` = format OUVERT
-- (pas de contrainte enum → nouveaux formats sans migration).
create table if not exists activities (
  id                 uuid primary key default gen_random_uuid(),
  article_version_id uuid not null references article_versions(id) on delete cascade,
  phase              int not null,                 -- 0..4 (conteneur)
  position           int not null default 0,       -- ordre dans la phase
  type               text not null,                -- 'discovery','situation_choice','ordering','matching','cloze','select_elements','argued_answer',...
  objective          text,                         -- objectif pédagogique
  difficulty         text check (difficulty in ('simple','intermediaire','complexe','piege')),
  weight             numeric not null default 1,   -- pondération dans le score de phase
  prompt             jsonb not null default '{}'::jsonb,  -- payload par type (PUBLIC)
  status             text not null default 'draft' check (status in ('draft','validated','published')),
  created_at         timestamptz not null default now()
);

-- Clé de correction + méthode d'évaluation + feedback : SECRET (admin only, jamais servi au client).
create table if not exists activity_solutions (
  activity_id uuid primary key references activities(id) on delete cascade,
  solution    jsonb not null default '{}'::jsonb,  -- réponse(s) correcte(s)
  evaluation  jsonb not null default '{}'::jsonb,  -- {method, pass_threshold, criteria, confusions...}
  feedback    jsonb not null default '{}'::jsonb   -- messages (révélés APRÈS tentative)
);

-- Tentatives d'activité (par utilisateur) — volumineux → partitionné par mois.
create table if not exists activity_attempts (
  id          uuid not null default gen_random_uuid(),
  user_id     uuid not null,
  activity_id uuid not null,
  response    jsonb,
  score       numeric,          -- 0..1
  passed      boolean,
  detail      jsonb,            -- diagnostic (confusions, critères remplis...)
  created_at  timestamptz not null default now(),
  primary key (id, created_at)
) partition by range (created_at);
create table if not exists activity_attempts_default partition of activity_attempts default;
select ensure_month_partition('activity_attempts', current_date);
select ensure_month_partition('activity_attempts', (current_date + interval '1 month')::date);

-- Index
create index if not exists activities_version_phase_idx on activities (article_version_id, phase, position);
create index if not exists activities_published_idx on activities (article_version_id) where status = 'published';
create index if not exists activity_attempts_user_idx on activity_attempts (user_id, created_at);
create index if not exists activity_attempts_activity_idx on activity_attempts (activity_id);

-- RLS
alter table activities         enable row level security;
alter table activity_solutions enable row level security;
alter table activity_attempts  enable row level security;

create policy activities_read  on activities for select using (status = 'published' or is_content_admin());
create policy activities_write on activities for all using (is_content_admin()) with check (is_content_admin());
create policy activity_solutions_admin on activity_solutions for all using (is_content_admin()) with check (is_content_admin());
create policy activity_attempts_own on activity_attempts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy activity_attempts_admin on activity_attempts for select using (is_admin());

-- Retrait de l'ancien modèle par phase (superseded, non peuplé).
drop table if exists situations cascade;
drop table if exists comprehension_blocks cascade;
drop table if exists memorization_items cascade;
drop table if exists article_pedagogy cascade;
drop table if exists attempts cascade;  -- remplacé par activity_attempts

commit;
