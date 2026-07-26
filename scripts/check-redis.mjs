// Validation d'Upstash Redis : connectivité, cache, ET propriétés du verrou.
// Usage : node --env-file=.env.local scripts/check-redis.mjs
//
// Ne se contente pas de « ça répond » : vérifie l'exclusion mutuelle et le fait
// qu'un verrou ne peut PAS être relâché par un autre détenteur — la propriété
// qui empêche une génération IA d'être payée deux fois.
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  console.error("✗ UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN absents de l'environnement.");
  process.exit(1);
}

const redis = new Redis({ url, token });
const KEY = `jbf:selftest:lock:${Date.now()}`;
const RELEASE = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end`;

let failed = 0;
const check = (ok, label, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};

try {
  // 1. Connectivité + aller-retour de cache
  const started = Date.now();
  await redis.set(`${KEY}:probe`, { hello: "jurist" }, { ex: 30 });
  const roundtrip = await redis.get(`${KEY}:probe`);
  check(roundtrip?.hello === "jurist", "cache : écriture puis lecture", `${Date.now() - started} ms`);

  // 2. Expiration réellement posée (sinon les clés s'accumuleraient sans fin)
  const ttl = await redis.ttl(`${KEY}:probe`);
  check(ttl > 0 && ttl <= 30, "cache : TTL appliqué", `${ttl} s restantes`);

  // 3. Acquisition du verrou
  const tokenA = "worker-A";
  const got = await redis.set(KEY, tokenA, { nx: true, ex: 30 });
  check(got === "OK", "verrou : premier acquéreur obtient le verrou");

  // 4. EXCLUSION MUTUELLE — un second acquéreur doit échouer
  const second = await redis.set(KEY, "worker-B", { nx: true, ex: 30 });
  check(second === null, "verrou : un second acquéreur est refusé");

  // 5. PROPRIÉTÉ CRITIQUE — un tiers ne peut pas relâcher le verrou d'autrui
  const stolen = await redis.eval(RELEASE, [KEY], ["worker-B"]);
  check(stolen === 0, "verrou : un autre détenteur ne peut PAS le relâcher");
  const stillHeld = await redis.get(KEY);
  check(stillHeld === tokenA, "verrou : toujours détenu par son propriétaire après tentative");

  // 6. Le propriétaire légitime le relâche
  const freed = await redis.eval(RELEASE, [KEY], [tokenA]);
  check(freed === 1, "verrou : le propriétaire le relâche");
  const after = await redis.get(KEY);
  check(after === null, "verrou : la clé est bien libérée");

  // 7. Réacquisition possible ensuite
  const reacquired = await redis.set(KEY, "worker-C", { nx: true, ex: 5 });
  check(reacquired === "OK", "verrou : réacquérable après libération");

  await redis.del(KEY, `${KEY}:probe`);
} catch (e) {
  console.error(`✗ erreur : ${e.message}`);
  failed++;
}

console.log(
  failed === 0
    ? "\nRedis opérationnel : cache actif, exclusion mutuelle garantie."
    : `\n${failed} vérification(s) en échec.`,
);
process.exit(failed === 0 ? 0 : 1);
