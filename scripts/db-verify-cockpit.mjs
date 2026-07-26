// Vérification LECTURE SEULE de l'état du schéma Cockpit (migrations 0016/0017).
// N'écrit rien. Usage :
//   node --env-file=.env.local scripts/db-verify-cockpit.mjs
import pg from "pg";

const client = new pg.Client({
  host: process.env.SUPABASE_DB_HOST,
  port: Number(process.env.SUPABASE_DB_PORT ?? 6543),
  user: process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_DB_PASSWORD,
  database: process.env.SUPABASE_DB_NAME ?? "postgres",
  ssl: { rejectUnauthorized: false },
});

const FUNCTIONS = [
  "raise_alert",
  "resolve_alerts",
  "ai_cost_since",
  "admin_ai_usage_summary",
  "admin_jobs_health",
  "admin_overview",
  "admin_timeseries",
  "admin_list_users",
  "admin_user_detail",
];

const INDEXES = [
  "profiles_created_idx",
  "xp_ledger_created_idx",
  "exam_sessions_started_idx",
  "seals_earned_idx",
  "invoices_issued_idx",
  "jobs_status_idx",
  "ai_generations_created_idx",
];

await client.connect();
let problems = 0;

// --- 0016 : table ----------------------------------------------------------
const t = await client.query(
  `select to_regclass('public.system_alerts') is not null as ok`,
);
const tableOk = t.rows[0].ok;
console.log(`${tableOk ? "✓" : "✗"} table system_alerts`);
if (!tableOk) problems++;

// --- 0016 : fonctions ------------------------------------------------------
const f = await client.query(
  `select p.proname from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = any($1)`,
  [FUNCTIONS],
);
const found = new Set(f.rows.map((r) => r.proname));
for (const name of FUNCTIONS) {
  const ok = found.has(name);
  console.log(`${ok ? "✓" : "✗"} fonction ${name}()`);
  if (!ok) problems++;
}

// --- 0017 : index (existence ET validité) ----------------------------------
// Un CREATE INDEX CONCURRENTLY interrompu laisse un index INVALIDE, présent
// mais ignoré par le planificateur : il faut le repérer explicitement.
const idx = await client.query(
  `select c.relname, i.indisvalid, i.indisready
     from pg_class c
     join pg_index i on i.indexrelid = c.oid
    where c.relname = any($1)`,
  [INDEXES],
);
const idxMap = new Map(idx.rows.map((r) => [r.relname, r]));
for (const name of INDEXES) {
  const row = idxMap.get(name);
  if (!row) {
    console.log(`✗ index ${name} — ABSENT`);
    problems++;
  } else if (!row.indisvalid || !row.indisready) {
    console.log(`✗ index ${name} — INVALIDE (à supprimer puis recréer) : drop index if exists ${name};`);
    problems++;
  } else {
    console.log(`✓ index ${name}`);
  }
}

// --- Épreuve de vérité : la fonction principale répond-elle ? ---------------
if (tableOk && found.has("admin_overview")) {
  try {
    const r = await client.query("select admin_overview() as data");
    const users = r.rows[0].data?.users?.total;
    console.log(`✓ admin_overview() s'exécute (${users} utilisateur(s) comptés)`);
  } catch (e) {
    console.log(`✗ admin_overview() échoue : ${e.message}`);
    problems++;
  }
}

await client.end();
console.log(problems === 0 ? "\nSchéma cockpit complet." : `\n${problems} problème(s) à corriger.`);
process.exit(problems === 0 ? 0 : 1);
