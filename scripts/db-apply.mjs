// Applique un fichier .sql sur Supabase via connexion Postgres directe (pooler).
// Usage : node --env-file=.env.local scripts/db-apply.mjs <fichier.sql>
// Les identifiants viennent de l'environnement (jamais committés).
import { readFileSync } from "node:fs";
import pg from "pg";

const file = process.argv[2];
if (!file) {
  console.error("usage: node --env-file=.env.local scripts/db-apply.mjs <fichier.sql>");
  process.exit(1);
}

const sql = readFileSync(file, "utf8");
const client = new pg.Client({
  host: process.env.SUPABASE_DB_HOST,
  port: Number(process.env.SUPABASE_DB_PORT ?? 6543),
  user: process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_DB_PASSWORD,
  database: process.env.SUPABASE_DB_NAME ?? "postgres",
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  await client.query(sql);
  console.log(`✓ appliqué : ${file}`);
} catch (e) {
  console.error(`✗ ${file} : ${e.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
