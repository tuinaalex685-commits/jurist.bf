// Dry-run d'une migration : exécute le SQL dans une transaction TOUJOURS annulée.
// Valide la syntaxe ET la sémantique (colonnes/tables/fonctions référencées)
// contre le schéma réel, sans persister quoi que ce soit.
import { readFileSync } from "node:fs";
import pg from "pg";

const file = process.argv[2];
if (!file) {
  console.error("usage: node --env-file=.env.local dry-run.mjs <fichier.sql>");
  process.exit(1);
}

// On retire les begin;/commit; du fichier pour piloter nous-mêmes la transaction
// (sinon le commit interne validerait réellement les changements).
const raw = readFileSync(file, "utf8");
const sql = raw
  .replace(/^\s*begin\s*;/im, "")
  .replace(/commit\s*;\s*$/im, "");

if (/\bcommit\b/i.test(sql)) {
  console.error("✗ un COMMIT subsiste dans le SQL — dry-run annulé par sécurité");
  process.exit(1);
}

const client = new pg.Client({
  host: process.env.SUPABASE_DB_HOST,
  port: Number(process.env.SUPABASE_DB_PORT ?? 6543),
  user: process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_DB_PASSWORD,
  database: process.env.SUPABASE_DB_NAME ?? "postgres",
  ssl: { rejectUnauthorized: false },
});

await client.connect();
let failed = false;
try {
  await client.query("begin");
  await client.query(sql);
  console.log(`✓ SQL valide (sémantique vérifiée contre le schéma réel) : ${file}`);
} catch (e) {
  failed = true;
  console.error(`✗ ${file}`);
  console.error(`  ${e.message}`);
  if (e.position) console.error(`  position: ${e.position}`);
  if (e.hint) console.error(`  hint: ${e.hint}`);
  if (e.where) console.error(`  where: ${e.where}`);
} finally {
  await client.query("rollback");
  console.log("↩ transaction annulée (aucune modification persistée)");
  await client.end();
}
process.exit(failed ? 1 : 0);
