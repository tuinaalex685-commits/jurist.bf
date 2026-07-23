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
