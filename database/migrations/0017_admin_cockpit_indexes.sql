-- ============================================================================
-- 0017 — Index du Cockpit Admin (B9), construits SANS VERROU D'ÉCRITURE.
--
-- ⚠ CE FICHIER N'EST PAS TRANSACTIONNEL — aucun begin/commit.
--   `CREATE INDEX CONCURRENTLY` est interdit dans un bloc de transaction, et
--   c'est précisément ce qui permet de construire l'index sans bloquer les
--   écritures des utilisateurs. À appliquer instruction par instruction :
--
--     node --env-file=.env.local scripts/db-apply-concurrent.mjs \
--       database/migrations/0017_admin_cockpit_indexes.sql
--
--   En cas d'échec en cours de route, Postgres laisse un index INVALIDE :
--   le supprimer (`drop index if exists <nom>`) puis relancer. Le script
--   signale ce cas explicitement.
--
-- POURQUOI ces index : le cockpit balaie ces tables PAR DATE, globalement.
-- Les index existants sont préfixés par `user_id` (xp_ledger_user_idx, etc.),
-- donc inutilisables pour un filtre portant uniquement sur la date.
-- ============================================================================

-- Séries « nouveaux inscrits / jour » + tri de l'annuaire admin.
create index concurrently if not exists profiles_created_idx
  on profiles (created_at);

-- Cœur des séries d'activité (utilisateurs actifs, XP gagné par jour).
create index concurrently if not exists xp_ledger_created_idx
  on xp_ledger (created_at);

-- Volume d'examens par jour.
create index concurrently if not exists exam_sessions_started_idx
  on exam_sessions (started_at);

-- Sceaux décernés par jour + KPI « sceaux 7 jours ».
create index concurrently if not exists seals_earned_idx
  on seals (earned_at);

-- Chiffre d'affaires : seules les factures payées sont sommées → index partiel.
create index concurrently if not exists invoices_issued_idx
  on invoices (issued_at) where status = 'paid';

-- Santé de la file : comptages par statut (l'index existant est partiel
-- pending/error, insuffisant pour compter `done`/`dead`).
create index concurrently if not exists jobs_status_idx
  on jobs (status);

-- Volume de générations IA par jour.
create index concurrently if not exists ai_generations_created_idx
  on ai_generations (created_at);
