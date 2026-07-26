-- ============================================================================
-- 0016 — Cockpit Admin (B9)
-- Alertes système (dédupliquées par empreinte) + fonctions d'agrégation.
--
-- PRINCIPE : toute statistique du cockpit est calculée EN SQL, jamais en
-- ramenant les lignes côté Node. Les tables d'usage (ai_usage, xp_ledger,
-- review_logs…) croissent sans borne : sommer en JS ne tient pas en production.
-- Toutes ces fonctions sont réservées à `service_role` (le backend admin les
-- appelle via le client admin ; jamais exposées au navigateur).
-- ============================================================================
begin;

-- ---------------------------------------------------------------------------
-- Alertes système : budget dépassé, jobs morts, coupe-circuit ouvert…
-- Dédupliquées par `fingerprint` tant qu'elles ne sont pas résolues, pour que
-- 500 jobs en échec produisent UNE alerte à 500 occurrences, pas 500 alertes.
-- ---------------------------------------------------------------------------
create table if not exists system_alerts (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null,              -- 'ai_budget','jobs_dead','circuit_open','worker_stalled',...
  severity        text not null default 'warning' check (severity in ('info','warning','critical')),
  title           text not null,
  body            text,
  meta            jsonb not null default '{}'::jsonb,
  fingerprint     text not null,              -- clé de dédup (stable par cause)
  occurrences     int not null default 1,
  first_seen_at   timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid references auth.users(id) on delete set null,
  resolved_at     timestamptz,
  created_at      timestamptz not null default now()
);

-- Une seule alerte VIVANTE par empreinte ; une fois résolue, une nouvelle peut naître.
create unique index if not exists system_alerts_live_fingerprint_uidx
  on system_alerts (fingerprint) where resolved_at is null;
create index if not exists system_alerts_open_idx
  on system_alerts (severity, last_seen_at desc) where resolved_at is null;
create index if not exists system_alerts_created_idx on system_alerts (created_at desc);

alter table system_alerts enable row level security;
drop policy if exists system_alerts_admin on system_alerts;
create policy system_alerts_admin on system_alerts for all
  using (is_admin()) with check (is_admin());

-- NB : les index sur les tables EXISTANTES (profiles, xp_ledger, seals…) vivent
-- en 0017, en CREATE INDEX CONCURRENTLY hors transaction : un CREATE INDEX
-- ordinaire verrouille les écritures de la table le temps de la construction,
-- inacceptable sur une base en production. Ceux ci-dessus portent sur
-- `system_alerts`, table neuve et vide → aucune contention possible.

-- ---------------------------------------------------------------------------
-- Levée d'alerte idempotente. Renvoie l'id de l'alerte (créée ou incrémentée).
-- ---------------------------------------------------------------------------
create or replace function raise_alert(
  p_kind        text,
  p_severity    text,
  p_title       text,
  p_body        text default null,
  p_meta        jsonb default '{}'::jsonb,
  p_fingerprint text default null
) returns uuid
language plpgsql as $$
declare
  v_fp text := coalesce(p_fingerprint, p_kind);
  v_id uuid;
begin
  insert into system_alerts (kind, severity, title, body, meta, fingerprint)
  values (p_kind, p_severity, p_title, p_body, coalesce(p_meta, '{}'::jsonb), v_fp)
  on conflict (fingerprint) where resolved_at is null
  do update set
    occurrences  = system_alerts.occurrences + 1,
    last_seen_at = now(),
    severity     = excluded.severity,
    title        = excluded.title,
    body         = excluded.body,
    meta         = excluded.meta
  returning id into v_id;
  return v_id;
end $$;

-- Résout toutes les alertes vivantes d'une empreinte (la cause a disparu).
create or replace function resolve_alerts(p_fingerprint text)
returns int language sql as $$
  with updated as (
    update system_alerts set resolved_at = now()
    where fingerprint = p_fingerprint and resolved_at is null
    returning 1
  )
  select count(*)::int from updated;
$$;

-- ---------------------------------------------------------------------------
-- Coût IA sur une fenêtre — remplace la somme côté Node (scan complet).
-- ---------------------------------------------------------------------------
create or replace function ai_cost_since(p_since timestamptz)
returns numeric language sql stable as $$
  select coalesce(sum(cost_usd), 0)::numeric from ai_usage where created_at >= p_since;
$$;

-- Synthèse IA complète en UN aller-retour (coûts, cache, volumétrie).
create or replace function admin_ai_usage_summary()
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'todayCostUsd',     ai_cost_since(date_trunc('day', now())),
    'monthCostUsd',     ai_cost_since(date_trunc('month', now())),
    'dailyLimitUsd',    (select daily_usd    from ai_budget_config where id = 1),
    'monthlyLimitUsd',  (select monthly_usd  from ai_budget_config where id = 1),
    'circuitOpen',      (select circuit_open from ai_budget_config where id = 1),
    'totalGenerations', (select count(*) from ai_generations),
    'totalCostUsd',     (select coalesce(sum(cost_usd), 0) from ai_usage),
    'totalTokensIn',    (select coalesce(sum(tokens_in), 0) from ai_usage),
    'totalTokensOut',   (select coalesce(sum(tokens_out), 0) from ai_usage),
    'cacheHitRate',     (select case when count(*) = 0 then 0
                                else count(*) filter (where cache_hit)::numeric / count(*) end
                         from ai_usage)
  );
$$;

-- ---------------------------------------------------------------------------
-- Santé de la file de traitement (jobs) + détection de worker à l'arrêt.
-- ---------------------------------------------------------------------------
create or replace function admin_jobs_health()
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'pending', count(*) filter (where status = 'pending'),
    'running', count(*) filter (where status = 'running'),
    'error',   count(*) filter (where status = 'error'),
    'dead',    count(*) filter (where status = 'dead'),
    'done',    count(*) filter (where status = 'done'),
    -- Âge (secondes) du plus vieux job exigible non traité : si ça grimpe, le worker ne tourne plus.
    -- NB : le FILTER s'attache à l'agrégat `min(...)`, pas à l'expression qui l'enveloppe.
    'oldestPendingAgeS', coalesce(extract(epoch from (
                           now() - min(run_after) filter (where status in ('pending','error') and run_after <= now())
                         )), 0)::int,
    'lastCompletedAt',   max(updated_at) filter (where status = 'done')
  ) from jobs;
$$;

-- ---------------------------------------------------------------------------
-- KPI de tête du cockpit — UN aller-retour pour tout l'écran d'accueil.
-- ---------------------------------------------------------------------------
create or replace function admin_overview()
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'users', jsonb_build_object(
      'total',      (select count(*) from profiles),
      'new7d',      (select count(*) from profiles where created_at >= now() - interval '7 days'),
      'new30d',     (select count(*) from profiles where created_at >= now() - interval '30 days'),
      'active7d',   (select count(distinct user_id) from xp_ledger where created_at >= now() - interval '7 days'),
      'active30d',  (select count(distinct user_id) from xp_ledger where created_at >= now() - interval '30 days'),
      'suspended',  (select count(*) from profiles where suspended_at is not null),
      'admins',     (select count(*) from profiles where role in ('admin','content_admin'))
    ),
    'revenue', jsonb_build_object(
      'paidTotalCents', (select coalesce(sum(amount_cents), 0) from invoices where status = 'paid'),
      'paid30dCents',   (select coalesce(sum(amount_cents), 0) from invoices
                          where status = 'paid' and issued_at >= now() - interval '30 days'),
      'currency',       (select coalesce(max(currency), 'XOF') from invoices where status = 'paid'),
      'activeSubs',     (select count(*) from subscriptions where status = 'active'),
      'trialingSubs',   (select count(*) from subscriptions where status = 'trialing'),
      'pastDueSubs',    (select count(*) from subscriptions where status = 'past_due'),
      'codesUnused',    (select count(*) from access_codes where status = 'unused'),
      'codesActive',    (select count(*) from access_codes where status = 'active')
    ),
    'content', jsonb_build_object(
      'codes',              (select count(*) from legal_codes),
      'articles',           (select count(*) from articles where archived_at is null),
      'versionsPublished',  (select count(*) from article_versions where status = 'published'),
      'activitiesDraft',    (select count(*) from activities where status = 'draft'),
      'activitiesPublished',(select count(*) from activities where status = 'published'),
      'examQuestions',      (select count(*) from exam_questions_bank where status = 'published')
    ),
    'learning', jsonb_build_object(
      'seals',        (select count(*) from seals),
      'seals7d',      (select count(*) from seals where earned_at >= now() - interval '7 days'),
      'xpTotal',      (select coalesce(sum(xp_total), 0) from user_stats),
      'examSessions', (select count(*) from exam_sessions where submitted_at is not null),
      'examPassRate', (select case when count(*) filter (where submitted_at is not null) = 0 then 0
                              else count(*) filter (where passed)::numeric
                                   / count(*) filter (where submitted_at is not null) end
                       from exam_sessions),
      'srsDueNow',    (select count(*) from srs_cards where due_at <= now())
    ),
    'ai',    admin_ai_usage_summary(),
    'jobs',  admin_jobs_health(),
    'alerts', jsonb_build_object(
      'open',     (select count(*) from system_alerts where resolved_at is null),
      'critical', (select count(*) from system_alerts where resolved_at is null and severity = 'critical'),
      'unacked',  (select count(*) from system_alerts where resolved_at is null and acknowledged_at is null)
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- Séries journalières (graphiques). Zéro-remplies via generate_series pour que
-- le frontend n'ait jamais à combler les trous.
-- ---------------------------------------------------------------------------
create or replace function admin_timeseries(p_days int default 30)
returns table (
  day            date,
  new_users      int,
  active_users   int,
  xp_earned      int,
  exam_sessions  int,
  reviews        int,
  seals          int,
  ai_cost_usd    numeric,
  ai_generations int
)
language sql stable as $$
  with days as (
    select generate_series(
      (current_date - (greatest(p_days, 1) - 1) * interval '1 day')::date,
      current_date,
      interval '1 day'
    )::date as day
  )
  select
    d.day,
    (select count(*)::int from profiles p where p.created_at::date = d.day),
    (select count(distinct x.user_id)::int from xp_ledger x where x.created_at::date = d.day),
    (select coalesce(sum(x.delta), 0)::int from xp_ledger x where x.created_at::date = d.day),
    (select count(*)::int from exam_sessions s where s.started_at::date = d.day),
    (select count(*)::int from review_logs r where r.reviewed_at::date = d.day),
    (select count(*)::int from seals s where s.earned_at::date = d.day),
    (select coalesce(sum(u.cost_usd), 0)::numeric from ai_usage u where u.created_at::date = d.day),
    (select count(*)::int from ai_generations g where g.created_at::date = d.day)
  from days d
  order by d.day;
$$;

-- ---------------------------------------------------------------------------
-- Liste paginée d'utilisateurs (email vient de auth.users, pas de profiles).
-- `total_count` via fenêtre : pagination sans seconde requête de comptage.
-- ---------------------------------------------------------------------------
create or replace function admin_list_users(
  p_search text default null,
  p_role   text default null,
  p_limit  int  default 25,
  p_offset int  default 0
)
returns table (
  id             uuid,
  email          text,
  display_name   text,
  role           text,
  suspended_at   timestamptz,
  created_at     timestamptz,
  xp_total       int,
  rank_level     int,
  streak_days    int,
  mastered_count int,
  last_active_on date,
  sub_status     text,
  total_count    bigint
)
language sql stable security definer set search_path = public as $$
  select
    p.id,
    u.email::text,
    p.display_name,
    p.role,
    p.suspended_at,
    p.created_at,
    coalesce(s.xp_total, 0),
    coalesce(s.rank_level, 1),
    coalesce(s.streak_days, 0),
    coalesce(s.mastered_count, 0),
    s.last_active_on,
    (select sub.status from subscriptions sub
      where sub.user_id = p.id order by sub.created_at desc limit 1),
    count(*) over ()
  from profiles p
  join auth.users u on u.id = p.id
  left join user_stats s on s.user_id = p.id
  where (p_role is null or p.role = p_role)
    and (
      p_search is null or p_search = ''
      or p.display_name ilike '%' || p_search || '%'
      or u.email ilike '%' || p_search || '%'
    )
  order by p.created_at desc
  limit greatest(least(p_limit, 200), 1)
  offset greatest(p_offset, 0);
$$;

-- Fiche détaillée d'un utilisateur (cockpit → vue 360°).
create or replace function admin_user_detail(p_user_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id',           p.id,
    'email',        u.email,
    'displayName',  p.display_name,
    'role',         p.role,
    'suspendedAt',  p.suspended_at,
    'createdAt',    p.created_at,
    'orgId',        p.org_id,
    'stats', jsonb_build_object(
      'xpTotal',       coalesce(s.xp_total, 0),
      'rankLevel',     coalesce(s.rank_level, 1),
      'streakDays',    coalesce(s.streak_days, 0),
      'masteredCount', coalesce(s.mastered_count, 0),
      'lastActiveOn',  s.last_active_on
    ),
    'seals',        (select count(*) from seals where user_id = p.id),
    'badges',       (select count(*) from user_badges where user_id = p.id),
    'examSessions', (select count(*) from exam_sessions where user_id = p.id and submitted_at is not null),
    'examPassed',   (select count(*) from exam_sessions where user_id = p.id and passed),
    'srsDue',       (select count(*) from srs_cards where user_id = p.id and due_at <= now()),
    'srsTotal',     (select count(*) from srs_cards where user_id = p.id),
    'subscription', (select to_jsonb(sub) from subscriptions sub
                      where sub.user_id = p.id order by sub.created_at desc limit 1),
    'recentXp',     (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb)
                      from (select delta, reason, created_at from xp_ledger
                            where user_id = p.id order by created_at desc limit 20) x)
  )
  from profiles p
  join auth.users u on u.id = p.id
  left join user_stats s on s.user_id = p.id
  where p.id = p_user_id;
$$;

-- ---------------------------------------------------------------------------
-- Verrouillage : ces fonctions ne doivent JAMAIS être appelables par un client
-- authentifié classique (elles contournent la RLS pour agréger).
-- ---------------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'raise_alert(text,text,text,text,jsonb,text)',
    'resolve_alerts(text)',
    'ai_cost_since(timestamptz)',
    'admin_ai_usage_summary()',
    'admin_jobs_health()',
    'admin_overview()',
    'admin_timeseries(int)',
    'admin_list_users(text,text,int,int)',
    'admin_user_detail(uuid)'
  ] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

commit;
