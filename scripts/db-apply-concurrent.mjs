// Applique un .sql NON transactionnel, instruction par instruction.
// Indispensable pour `CREATE INDEX CONCURRENTLY`, interdit dans un bloc de
// transaction — or node-postgres regroupe implicitement en une transaction
// plusieurs instructions envoyées d'un seul tenant.
//
// Usage : node --env-file=.env.local scripts/db-apply-concurrent.mjs <fichier.sql>
import { readFileSync } from "node:fs";
import pg from "pg";

const file = process.argv[2];
if (!file) {
  console.error("usage: node --env-file=.env.local scripts/db-apply-concurrent.mjs <fichier.sql>");
  process.exit(1);
}

const raw = readFileSync(file, "utf8");
if (/^\s*(begin|commit)\s*;/im.test(raw)) {
  console.error("✗ ce fichier contient begin/commit — utilisez scripts/db-apply.mjs à la place");
  process.exit(1);
}

// Découpe naïve mais suffisante ici : ce fichier ne contient que des DDL
// simples (aucun corps de fonction, donc aucun `;` imbriqué dans un $$…$$).
if (raw.includes("$$")) {
  console.error("✗ corps $$…$$ détecté : le découpage par `;` serait incorrect");
  process.exit(1);
}

const statements = raw
  .split("\n")
  .filter((l) => !l.trim().startsWith("--"))
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

const client = new pg.Client({
  host: process.env.SUPABASE_DB_HOST,
  port: Number(process.env.SUPABASE_DB_PORT ?? 6543),
  user: process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_DB_PASSWORD,
  database: process.env.SUPABASE_DB_NAME ?? "postgres",
  ssl: { rejectUnauthorized: false },
});

await client.connect();
let failed = 0;
for (const [i, stmt] of statements.entries()) {
  const label = stmt.replace(/\s+/g, " ").slice(0, 80);
  const started = Date.now();
  try {
    await client.query(stmt);
    console.log(`✓ [${i + 1}/${statements.length}] ${label} (${Date.now() - started} ms)`);
  } catch (e) {
    failed++;
    console.error(`✗ [${i + 1}/${statements.length}] ${label}`);
    console.error(`  ${e.message}`);
    // Un CREATE INDEX CONCURRENTLY interrompu laisse un index INVALIDE qui
    // doit être supprimé avant toute nouvelle tentative — on le dit ici.
    if (/concurrently/i.test(stmt)) {
      const m = stmt.match(/if not exists\s+(\w+)/i);
      if (m) console.error(`  → vérifiez/supprimez l'index invalide : drop index if exists ${m[1]};`);
    }
  }
}
await client.end();

console.log(failed ? `\n${failed} instruction(s) en échec.` : "\nToutes les instructions ont réussi.");
process.exit(failed ? 1 : 0);
