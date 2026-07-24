# Jurist BF — Architecture Backend (production-grade)

> Niveau **Staff/Principal Backend Engineer**. Cible : milliers → dizaines de milliers
> d'étudiants, multi-universités, multi-pays, multi-codes, contenu versionné, un ou plusieurs
> admins. Le backend **alimente exactement** l'expérience définie dans `PRD`, `DESIGN-VISION.md`
> et `EXPERIENCE-DESIGN.md`. Consolide et remplace `BACKEND-PLAN.md`.
>
> **Aucune ligne de code avant validation de ce document.**

---

## 1. Objectifs & contraintes

- **Fiabilité > Robustesse > Sécurité > Maintenabilité > Performance > Coût > Fonctionnalités.**
- Doit tenir la charge réelle universitaire (pics de rentrée : des centaines d'inscriptions/lancements simultanés) **sans réécriture**.
- **Coût maîtrisé** même à forte charge (l'IA est le poste de coût n°1 → dédup obligatoire).
- **Multi-tenant** dès la conception (universités, pays, codes) sans surcoût de complexité pour le MVP.
- **Contenu versionné** : un article peut évoluer sans casser l'historique des utilisateurs.

### Scénarios de charge de référence (à tenir)
| Scénario | Exigence backend |
|---|---|
| 500 étudiants lancent un Parcours en même temps | lectures cacheables (contenu `published` partagé), pas d'IA en chemin critique |
| 300 génèrent/consultent des exercices | **0 régénération IA** (cache partagé par version d'article), file async |
| 250 passent un Examen simultané | écritures bornées, transactions courtes, pas de verrou long |
| Rentrée : pics d'inscription + codes d'accès | rate limiting, activation idempotente, pooler DB |

---

## 2. Principes d'architecture (non négociables)

1. **Séparation stricte en couches** — Route (I/O) → Service (métier) → Repository (données) → DB. **Aucune logique métier dans les routes.**
2. **Stateless** — l'API ne garde pas d'état en mémoire (scalabilité horizontale serverless). L'état vit en DB / cache.
3. **RLS-first** — l'autorisation réelle est dans PostgreSQL (Row Level Security), pas seulement dans l'API. Défense en profondeur.
4. **Async-first pour le lourd** — toute tâche coûteuse/lente (IA, e-mails, agrégats) sort du chemin requête → file + workers.
5. **Cost-aware** — rien n'est recalculé/régénéré inutilement (cache + dédup + rollups).
6. **Idempotence** — mutations sensibles et jobs sont idempotents (clé d'idempotence / hash d'entrée).
7. **Append-only pour l'auditable** — XP, révisions, analytics, audit = journaux immuables (source de vérité, reconstructibles).
8. **Contenu versionné & immuable une fois publié** — la progression référence une **version** de contenu.
9. **Contrats explicites** — DTO validés (Zod) en entrée/sortie ; le frontend consomme une API versionnée `/api/v1`.

---

## 3. Choix technologiques (justifiés)

| Domaine | Choix | Justification | Alternative écartée |
|---|---|---|---|
| Runtime API | **Next.js 16 Route Handlers** (`/api/v1/*`) sur Vercel | Co-localisé avec le front, déploiement/scalabilité serverless gratuits, un seul repo ; **mais** couches internes portables (on peut extraire un service Node plus tard) | Microservices NestJS d'emblée = complexité prématurée |
| Base de données | **PostgreSQL (Supabase)** | Données relationnelles fortes (progression, SRS, examens) → ACID + jointures ; RLS multi-tenant ; PITR managé | NoSQL = jointures/consistance douloureuses ici |
| Connexions DB | **Supavisor (pooler) en mode transaction** | Serverless = beaucoup de connexions courtes → le pooler évite l'épuisement | Connexion directe = saturation à la charge |
| Auth | **Supabase Auth** (JWT) + `profiles.role` + claims | Intégré à RLS, sessions cookies SSR (`@supabase/ssr`), OAuth/magic link dispo | Auth maison = surface de risque inutile |
| Autorisation | **RLS Postgres** + garde applicative | Barrière au plus près de la donnée ; l'API ne peut pas « oublier » un filtre | AuthZ uniquement applicative = fragile |
| File d'attente | **pgmq** (file Postgres transactionnelle) + worker déclenché par **cron** (Vercel Cron + `pg_cron` en secours) ; abstraction `Queue` | In-stack, transactionnel (enqueue dans la même tx que l'écriture métier), coût nul | Kafka/SQS = surdimensionné au départ ; abstraction permet de migrer vers **QStash/SQS** sans refonte |
| Cache & rate limit | **Upstash Redis** (HTTP, serverless) + `@upstash/ratelimit` | Cache lectures chaudes, verrous de dédup IA, quotas ; compatible serverless ; pay-per-use | Redis auto-hébergé = ops inutile |
| IA | **Gemini** derrière un **service de génération** (dédup, quotas, coût, retry) | Contenu dérivé de la base **validée** → cache **partagé** entre tous les users | Appels directs depuis le front/route = coût + risque |
| Stockage | **Supabase Storage** (PDF sources, illustrations) + URLs signées | Intégré RLS/Auth, CDN | S3 séparé = intégration en plus |
| Validation | **Zod** (DTO aux frontières) | Typage runtime + statique, messages d'erreur clairs | Validation ad hoc = trous |
| Observabilité | **Sentry** (erreurs) + logs structurés (**Axiom**/Logflare) + uptime externe (**BetterStack**) | Standard, alerting, pas de réinvention | Logs `console` seuls = aveugle en prod |
| E-mails/notifs | **Resend** (transactionnel) + notifications in-app en DB | Fiable, simple ; in-app = table + realtime | — |

> **Verrou de connexion** : toutes les requêtes applicatives passent par le **pooler** (chaîne pooled), transactions **courtes**, jamais de transaction ouverte pendant un appel réseau externe.

---

## 4. Couches & arborescence

Séparation stricte ; la dépendance ne va que **vers le bas** (Route → Service → Repository → DB). Les services ne connaissent ni HTTP ni SQL brut.

```
src/
├─ app/
│  ├─ api/v1/…              # Route Handlers = I/O only (auth, validation Zod, appel service, mapping réponse)
│  └─ (admin)/admin/…       # Cockpit admin (UI), gated
├─ server/                  # CŒUR BACKEND (aucun import React)
│  ├─ modules/              # découpage par domaine métier (bounded contexts)
│  │  ├─ auth/              # sessions, rôles, permissions
│  │  ├─ catalog/           # référentiel juridique (codes→domaines→…→articles + versions)
│  │  ├─ learning/          # parcours, phases, tentatives, progression
│  │  ├─ srs/               # révision espacée
│  │  ├─ exams/             # examens, questions, résultats
│  │  ├─ gamification/      # xp, rangs, badges, sceaux
│  │  ├─ notifications/
│  │  ├─ access/            # codes d'accès, organisations, abonnements
│  │  ├─ ai/                # génération, dédup, quotas, coût
│  │  ├─ analytics/         # événements, rollups, cockpit admin
│  │  └─ admin/             # requêtes agrégées cockpit
│  ├─ core/
│  │  ├─ db/                # client Supabase (server/admin), pooler, unit-of-work
│  │  ├─ queue/             # abstraction Queue (pgmq impl)
│  │  ├─ cache/             # abstraction Cache (Upstash impl) + clés + invalidation
│  │  ├─ ratelimit/
│  │  ├─ errors/            # types d'erreurs, mapping HTTP
│  │  ├─ events/            # bus d'événements domaine
│  │  ├─ logging/ observability/
│  │  └─ config/ env/       # validation d'env (Zod), secrets
│  └─ contracts/            # DTO + types partagés API (importés par le front)
├─ workers/                 # handlers de jobs (déclenchés par cron/queue) : ai.generate, notify.send, analytics.rollup…
database/
├─ migrations/              # SQL versionné (source de vérité du schéma)
└─ policies/                # RLS par table
```

Chaque **module** = `service.ts` (métier), `repository.ts` (accès DB), `dto.ts` (Zod), `events.ts`. Un **Repository** est la seule porte vers la DB d'un agrégat.

---

## 5. Modèle de données (normalisé, versionné, multi-tenant)

Conventions : `id uuid pk default gen_random_uuid()`, `created_at/updated_at timestamptz`, FK `on delete` explicites, `status` en enum, soft-delete via `archived_at` là où l'historique compte. RLS activée **partout**.

### 5.1 Identité & tenancy
- `organizations` (université/école) — `id, name, country_id, type, created_at`.
- `profiles` — `id → auth.users, role ∈ {student,admin,content_admin}, display_name, org_id?, locale, created_at`. (rôles extensibles → « plusieurs administrateurs » possible sans refonte.)
- `org_members` (si un user appartient à plusieurs orgs) — `org_id, user_id, role_in_org`.
- `roles`/`permissions` : matrice applicative (voir §7) ; le rôle est aussi porté par un **claim JWT** pour RLS rapide.

### 5.2 Référentiel juridique (hiérarchie complète du Codex)
`countries → legal_codes → domains → chapters → notions → articles`
- `countries (id, iso, name)`
- `legal_codes (id, country_id, name, type, description, position)`
- `domains (id, code_id, name, position)`
- `chapters (id, domain_id, name, position)`
- `notions (id, chapter_id, slug, name, intro, why, protects, outcomes jsonb, position)`
- `articles (id, notion_id, number, title, position, difficulty, estimated_minutes, current_version_id?)`

### 5.3 Versionnement du contenu (clé pour « plusieurs versions »)
- `article_versions (id, article_id, version_no, official_text, status ∈ {draft,in_review,published,archived}, created_by, published_at)`
  - `articles.current_version_id` pointe la version **publiée** servie aux étudiants.
  - Une version publiée est **immuable** ; une évolution crée une nouvelle version.
- **Contenu pédagogique attaché à une version** (jamais à l'article nu) :
  - `situations (id, article_version_id, level, scenario, context, characters jsonb, key_facts jsonb, question, answer, explanation, status, position)`
  - `comprehension_blocks (id, article_version_id, type, content, status, position)`
  - `memorization_items (id, article_version_id, cloze_template, blanks jsonb, level, status)`
  - `exam_questions_bank (id, article_version_id, type, payload jsonb, difficulty)` (mutualisée pour les examens)

> La progression et les résultats référencent `article_version_id` → l'historique reste **cohérent** même après republication.

### 5.4 Progression
- `user_article_progress (user_id, article_id, article_version_id, status ∈ {not_started,in_progress,mastered}, mastery_score numeric, current_phase int, started_at, mastered_at)` — PK `(user_id, article_id)`.
- `user_phase_progress (user_id, article_version_id, phase int, status, score, completed_at)`.
- `attempts (id, user_id, item_type ∈ {situation,comprehension,memorization,exam_question}, item_id, correct bool, payload jsonb, created_at)` — **volumineux → partitionné par mois** (§6).

### 5.5 Gamification
- `xp_ledger (id, user_id, delta int, reason, ref_type, ref_id, created_at)` — **append-only** ; solde = somme (ou table `user_stats` matérialisée maintenue par trigger/rollup).
- `ranks (level, name, xp_threshold)` (référentiel des 5 rangs).
- `badges (id, code, name, description, condition jsonb, icon)` + `user_badges (user_id, badge_id, earned_at)`.
- `seals (id, user_id, article_id, article_version_id, earned_at)` — le sceau de maîtrise (1 par article maîtrisé).
- `user_stats (user_id, xp_total, rank_level, streak_days, last_active_on, mastered_count)` — **agrégat maintenu** (lecture O(1) pour le Dashboard).

### 5.6 Révision espacée (SRS)
- `srs_cards (id, user_id, article_id, item_ref, ease numeric, interval_days int, reps int, lapses int, state ∈ {urgent,fragile,correct,mastered,anchored}, due_at, last_reviewed_at)` — index `(user_id, due_at)`.
- `review_logs (id, user_id, card_id, grade, prev_interval, next_interval, reviewed_at)` — **append-only** (courbes d'oubli, analytics « notions les plus oubliées »).

### 5.7 Examens
- `exams (id, scope jsonb {code/domain/level}, difficulty, duration_seconds, pass_threshold, reward jsonb, status)`
- `exam_sessions (id, exam_id, user_id, started_at, submitted_at, time_spent_s, score, passed bool, breakdown jsonb)`
- `exam_session_questions (id, session_id, question_id, given_answer jsonb, correct bool, time_ms)` (analyse détaillée + « questions problématiques »).

### 5.8 Notifications
- `notifications (id, user_id, type, title, body, data jsonb, read_at, created_at)` — index `(user_id, read_at)`, realtime via Supabase.

### 5.9 Accès & abonnements
- `access_code_batches (id, org_id?, label, plan, quantity, expires_at, created_by)`
- `access_codes (id, batch_id, code_hash, status ∈ {unused,active,revoked,expired}, redeemed_by?, redeemed_at)` — le code est **hashé** (jamais en clair).
- `subscriptions (id, user_id, plan, status, current_period_end, provider_ref)` + `invoices (…)` (revenu/MRR pour le cockpit).

### 5.10 IA (génération, cache, coût)
- `ai_generations (id, content_type, source_version_id, params_hash, input_hash UNIQUE, model, output jsonb, tokens_in, tokens_out, cost_usd, created_at)`
  - **Clé de dédup** : `input_hash = sha256(content_type + source_version_id + params + prompt_template_version)`. **Unicité** → jamais deux fois la même génération. Partagé par **tous** les utilisateurs.
- `ai_jobs (id, type, payload jsonb, status ∈ {pending,running,done,error,dead}, attempts int, max_attempts, idempotency_key UNIQUE, run_after, last_error, result jsonb, created_at, updated_at)` (adossé à pgmq).
- `ai_usage (id, user_id?, feature, tokens_in, tokens_out, cost_usd, created_at)` — coût par utilisateur/fonctionnalité (cockpit).

### 5.11 Observabilité & audit
- `audit_logs (id, actor_id, actor_role, action, target_type, target_id, meta jsonb, ip, created_at)` — actions admin/sensibles, **append-only**.
- `analytics_events (id, user_id?, org_id?, name, props jsonb, occurred_at)` — **partitionné par mois**, append-only ; source des rollups.
- `api_request_logs` (échantillonné) / métriques → surtout via Sentry/Axiom, pas en DB chaude.

---

## 6. Index & performance

- **FK** toutes indexées ; **composites** pour les requêtes chaudes :
  - `srs_cards (user_id, due_at)` — la séance du jour.
  - `user_article_progress (user_id, status)` — dashboard/biblio.
  - `attempts (user_id, created_at)` — historique.
  - `notifications (user_id, read_at)`.
- **Index partiels** : `… where status='published'` (contenu servi), `access_codes where status='unused'`.
- **Recherche** : `pg_trgm` + GIN sur `articles.title/number` et `official_text` (recherche ⌘K « invoquer un article »).
- **Partitionnement par mois** (range) : `attempts`, `analytics_events`, `review_logs` (tables à forte croissance) → purge/rétention par détachement de partition.
- **Vues matérialisées** pour le cockpit admin (agrégats lourds) rafraîchies par cron (`admin_daily_metrics`, `funnel_by_phase`, `article_success_rates`, `ai_cost_daily`) → **lectures admin en O(1)**, jamais d'agrégat à la volée sur les tables chaudes.
- **Pagination keyset (curseur)** partout (jamais `OFFSET` sur gros volumes).

---

## 7. Sécurité (production)

- **Auth** : Supabase Auth (JWT), sessions cookies SSR ; MFA activable ; e-mail vérifié requis pour actions sensibles.
- **Rôles/permissions** : `student` (ses données), `content_admin` (référentiel + validation contenu), `admin` (tout + cockpit). Matrice de permissions centralisée (`server/modules/auth/permissions.ts`) **et** reflétée en RLS.
- **RLS = barrière réelle** :
  - Référentiel & contenu : lecture si `status='published'` (ou rôle ≥ content_admin) ; écriture rôle ≥ content_admin.
  - Données utilisateur (`progress, attempts, srs, exam_sessions, notifications, seals, xp`) : `user_id = auth.uid()` strict.
  - Multi-tenant : contenu/cohortes restreints à une org filtrés par `org_id ∈ mes orgs`.
  - `service_role` : **worker/IA/admin serveur uniquement**, jamais exposé au client.
- **Validation** : Zod sur tout input ; PostgREST/`supabase-js` = requêtes paramétrées (anti-injection) ; jamais de SQL concaténé.
- **Rate limiting** (Upstash) par identité + par route : auth (anti-brute-force), rédemption de code, endpoints IA, mutations. Tiers par rôle.
- **Anti-spam/abus** : quotas IA par utilisateur, captcha sur inscription si besoin, détection de rédemption massive de codes.
- **Audit** : `audit_logs` sur actions admin (publication contenu, révocation code, suspension user, changements de rôle) + journalisation des jobs.
- **Secrets** : env validés (Zod) ; `SUPABASE_SERVICE_ROLE_KEY` / `GEMINI_API_KEY` uniquement côté serveur/worker.

---

## 8. API (contrat)

- **Versionnée** : `/api/v1/*`. Route Handlers = **thin** (auth → Zod → service → mapping).
- **Enveloppe** : succès `{ data, meta? }` ; erreur `{ error: { code, message, details? } }` avec codes stables (`UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION`, `RATE_LIMITED`, `CONFLICT`, `AI_BUDGET_EXCEEDED`…).
- **Pagination** : curseur (`?cursor=&limit=`), `meta.next_cursor`.
- **Idempotence** : header `Idempotency-Key` sur POST sensibles (rédemption code, soumission examen, démarrage génération).
- **DTO partagés** : `server/contracts` (importés par le front → contrat typé de bout en bout).

Surface (extrait) :
- `catalog` : `GET /codes`, `/codes/:id` (arbre domaines/chapitres/notions), `/articles/:id` (+ version publiée), `GET /search`.
- `learning` : `GET /articles/:id/parcours`, `POST /attempts`, `GET /me/progress`, `GET /me/dashboard` (agrégat unique du Poste de commandement).
- `srs` : `GET /me/revisions/session`, `POST /revisions/:cardId/grade`.
- `exams` : `POST /exams/:id/sessions`, `POST /sessions/:id/answers`, `POST /sessions/:id/submit`, `GET /sessions/:id/result`.
- `gamification` : `GET /me/profile` (rang, sceaux, badges).
- `access` : `POST /codes/redeem`.
- `admin` : `/admin/*` (métriques, users, contenu, codes, IA, monitoring) — rôle `admin`.

> Le **Dashboard** consomme un endpoint agrégé `GET /me/dashboard` (mission du jour, reprise, progression, rang, forces/faiblesses, révisions, sceaux, déblocage) → **1 requête**, servie depuis `user_stats` + caches, pas 12 requêtes.

---

## 9. Couche métier (services & repositories)

- **Services** : orchestrent les règles (notation d'une tentative, calcul `mastery_score`, passage de phase, attribution XP/sceau, planification SRS, montée de rang, déblocages). **Purs**, testables sans HTTP.
- **Repositories** : encapsulent les accès (une porte par agrégat) ; transactions via **unit-of-work** (`server/core/db`).
- **Événements domaine** (bus interne) : `PhaseCompleted`, `ArticleMastered`, `ExamPassed`, `SealEarned`, `StreakUpdated` → déclenchent notifications, rollups analytics, XP, sans coupler les modules.

---

## 10. Traitements asynchrones

- **File `pgmq`** (transactionnelle) : enqueue **dans la même transaction** que l'écriture métier (garantie d'exécution).
- **Worker** : route protégée (`/api/internal/worker`) déclenchée par **Vercel Cron** (chaque minute) + `pg_cron` en secours ; traite N messages, borne le temps d'exécution.
- **Types de jobs** : `ai.generate`, `notify.send`, `analytics.rollup`, `srs.reschedule`, `stats.recompute`, `email.send`.
- **Fiabilité** : `attempts/max_attempts`, **backoff exponentiel** (`run_after`), **DLQ** (`status='dead'`) + alerte, **idempotence** (`idempotency_key`). Un job échoué **n'est jamais perdu** (pas de « job zombie »).
- **Backpressure** : quotas par type ; si Gemini sature → circuit breaker + report.

---

## 11. Stratégie de cache

Couches, du plus proche du client au plus loin :
1. **CDN/Edge** (Vercel) : réponses publiques immuables (contenu `published` par `version_id` → clé de cache par version, invalidation naturelle à la republication).
2. **Redis (Upstash)** : lectures chaudes semi-dynamiques (arbre du Codex, agrégats dashboard `user_stats`, résultats de recherche), TTL court + invalidation événementielle.
3. **DB** : vues matérialisées (cockpit), `user_stats` (agrégat maintenu).
- **Invalidation** : par événement (`ArticleVersionPublished` → purge caches du code/article ; `AttemptRecorded`/`ArticleMastered` → maj `user_stats`). Jamais de cache sans stratégie d'invalidation.
- **Clés** centralisées (`server/core/cache/keys.ts`).

---

## 12. Stratégie IA (coût & qualité)

Objectif : **ne jamais régénérer deux fois** le même contenu, borner le coût, tracer.
1. **Génération dérivée de la base validée** : l'IA transforme `article_version + notion` en exercices → l'entrée est **déterministe par version** → **cache partagé** (`ai_generations.input_hash` unique). Un seul appel Gemini sert **tous** les étudiants du même article.
2. **Pipeline** : admin publie une version → job `ai.generate` (async) → sortie stockée en `draft` → validation `content_admin` → `published`. Rien n'est montré avant validation.
3. **Dédup & verrou** : verrou Redis sur `input_hash` pendant la génération (évite les doublons concurrents).
4. **Quotas & budget** : quota par utilisateur (features personnalisées éventuelles), **budget global mensuel** avec **coupe-circuit** (`AI_BUDGET_EXCEEDED`) + alerte.
5. **Résilience** : retry/backoff, timeouts, fallback « contenu déjà en cache » ; `ai_usage` trace tokens & coût par feature/user (cockpit).
6. **Historique** : `ai_generations` = historique complet des générations (audit, régénération explicite versionnée si le prompt évolue via `prompt_template_version`).

---

## 13. Montée en charge

- **API stateless** → scaling horizontal automatique (Vercel).
- **DB** : pooler (transaction mode) ; requêtes courtes et indexées ; **read replicas** Supabase quand la lecture domine ; **partitionnement** des tables chaudes ; agrégats précalculés (jamais de `COUNT(*)` massif à la volée).
- **Cache** en amont des lectures répétées ; **file** en amont des écritures lourdes/IA.
- **Réévaluation** : chaque scénario de charge (§1) est vérifié (chemin sans IA, transactions courtes, index présents) avant mise en prod.
- **Coût bas à l'échelle** : dédup IA + cache + rollups = le coût marginal par étudiant tend vers ~0 sur le contenu partagé.

---

## 14. Monitoring & santé

- **Health** : `/api/health` (DB, Redis, Gemini ping, queue depth) → uptime externe (BetterStack).
- **Erreurs** : Sentry (API + workers), alertes.
- **Logs structurés** : Axiom/Logflare (corrélation par `request_id`/`job_id`).
- **Métriques** : latence p50/p95/p99, taux d'erreur, **profondeur de file**, **jobs échoués/DLQ**, **coût IA/jour**, quotas Supabase/Gemini/Vercel.
- **Alertes** : DLQ non vide, budget IA proche du seuil, latence anormale, quota DB, échec de rollup.

---

## 15. Sauvegarde & reprise après incident

- **Backups** : Supabase daily + **PITR** (plan Pro) → **RPO** ~ minutes.
- **RTO** cible documenté ; **restore drills** périodiques (on teste réellement une restauration).
- **Schéma & migrations** en Git = source de vérité (reconstruction déterministe).
- **Runbook incident** : détection (alerte) → confinement → diagnostic (logs/Sentry) → correctif → post-mortem. Jobs rejouables (idempotents) après incident.
- **Exports** : sauvegarde logique périodique des tables critiques (contenu validé, users) hors Supabase.

---

## 16. Dashboard Admin — « Le Cockpit »

- **Séparé** : `/admin`, rôle `admin` (RLS + garde de route + audit d'accès). N'expose **jamais** de données à l'app étudiante.
- **Alimenté par vues matérialisées / rollups** (lectures rapides, coût bas) :
  - **Vue générale** : users, actifs (DAU/WAU/MAU), nouveaux, rétention (cohortes), progression globale, revenu, marge, croissance.
  - **Finances** : MRR/ARR, abonnements, coûts (IA + Supabase + Vercel), marge, évolution, LTV/CAC.
  - **IA** : coût Gemini total / par user / par fonctionnalité, générations, tokens, profondeur de file, jobs échoués, temps moyen.
  - **Utilisateurs** : recherche/filtre (pays, université, code, progression, dernier accès, coût IA, abonnement), suspension, historique.
  - **Contenu** : gestion codes→domaines→…→articles, publication/brouillons, **taux de réussite** par article, **taux d'abandon par phase** (entonnoir 0→4).
  - **Révisions** : stats mémoire, notions les plus oubliées, difficultés fréquentes.
  - **Examens** : réussite, moyenne, classement, temps moyen, questions problématiques.
  - **Codes d'accès** : génération de lots, activation, expiration, suivi, stats par lot.
  - **Monitoring** : santé API/Supabase/Gemini/Vercel, erreurs, latence, quotas, uptime, logs.

---

## 17. Risques techniques & mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| Serverless × connexions DB | Saturation à la charge | **Pooler** transaction mode, transactions courtes |
| Coût/latence Gemini, pics | Facture + lenteur | Dédup partagée, file async, budget + coupe-circuit, cache |
| Bugs RLS (fuite de données) | Sécurité | Suite de tests RLS dédiée, revue, principe deny-by-default |
| Complexité versionnement contenu | Incohérence historique | Progression liée à `version_id`, versions publiées immuables |
| Jobs perdus / zombies | Données incohérentes | pgmq transactionnel, retry/backoff, DLQ + alerte, idempotence |
| Agrégats admin coûteux | Charge DB | Vues matérialisées + rollups par cron, pas d'agrégat à la volée |
| Bus factor (1 admin) | Continuité | Rôles multiples prêts, runbook, backups testés |
| Lock-in Supabase | Flexibilité | Postgres standard + SQL portable + abstractions (queue/cache) |

---

## 18. Plan de mise en œuvre par lots (après validation)

- **B0** Fondations : env validés, clients DB (pooler/admin), abstractions (queue/cache/ratelimit/errors/events), contrats, structure modules.
- **B1** Données : migrations complètes (§5) + RLS (§7) + index (§6) + seed référentiel + versioning.
- **B2** Auth & tenancy : sessions, rôles/permissions, orgs, codes d'accès (rédemption idempotente).
- **B3** Catalog API (Codex) : arbre + articles + recherche + cache.
- **B4** Learning : parcours, tentatives, notation, progression, `GET /me/dashboard`, gamification (XP/rang/sceaux) + événements.
- **B5** SRS : cartes, séance, planification, logs.
- **B6** Examens : sessions, correction, résultats, analyse.
- **B7** IA : service génération + dédup + quotas/budget + worker + validation contenu.
- **B8** Notifications + analytics (événements → rollups).
- **B9** Cockpit admin (vues matérialisées) + monitoring + backups/DR.
- **B10** Durcissement : tests (unit/intégration/RLS/charge), audit sécurité, runbooks.

---

## 19. Décisions à valider avant le code

1. **File d'attente** : `pgmq + cron` (in-stack, coût nul) — recommandé — vs **QStash** (retries HTTP managés). L'abstraction permet de changer, mais quel défaut ?
2. **Cache/rate limit** : **Upstash Redis** (recommandé) — OK d'ajouter ce fournisseur ?
3. **Observabilité** : Sentry + Axiom + BetterStack — OK ou tu préfères un stack unique ?
4. **Multi-tenant maintenant** : j'intègre `organizations`/`org_id` dès B1 (peu de coût, évite une migration lourde plus tard) — tu valides ?
5. **Facturation** : provider (Stripe ?) pour MRR/abonnements du cockpit — ou codes d'accès seuls au départ ?
6. **Modèle Gemini** & budget mensuel plafond (valeur cible) pour le coupe-circuit.

---

## 20. Audit PRD ↔ Écrans → Endpoints (le backend alimente exactement l'expérience)

Routes frontend réelles auditées : `/` (Dashboard), `/library`, `/library/[codeId]`, `/learn/[articleId]`,
`/revisions`, `/synthese` (Examens) ; à créer : `/progression`, `/profil`, `/admin`. Le backend est
construit **autour du PRD** (reconnaître → comprendre → mémoriser → maîtriser + synthèse), l'écran n'étant
que la vue. Traçabilité :

| Écran (expérience) | Données nécessaires | Endpoint(s) | Sources / cache |
|---|---|---|---|
| Dashboard « Poste de commandement » | mission du jour, reprise, progression code, rang/XP, forces/faiblesses, révisions dues, sceaux, déblocage, assiduité | `GET /me/dashboard` (agrégat) | `user_stats`, `srs_cards`, `seals`, rollups + Redis |
| Shell (sidebar/header) | rang, série, XP restante, avatar | inclus dans `/me/dashboard` ou `GET /me/summary` | `user_stats` (Redis) |
| Bibliothèque « Codex » | arbre pays→code→domaine→chapitre→notion→article + progression/statut/difficulté/temps/score/phases | `GET /catalog/codes`, `GET /catalog/codes/:id`, `GET /me/progress?code=` | `catalog` (CDN/version) + `user_article_progress` |
| Recherche ⌘K | article par n°/notion | `GET /catalog/search?q=` | GIN pg_trgm |
| Parcours « Mission » | article + version publiée + phases 0-3 (situations/blocs/mémo) | `GET /learning/articles/:id/parcours` | contenu `published` par version (CDN) |
| Soumission de réponse (phase) | notation + feedback + maj progression/XP | `POST /learning/attempts` | service `learning` → événements |
| Maîtrise (phase 4) | attribution sceau + XP + éventuelle montée de rang | déclenché par `attempts`/service | `seals`, `xp_ledger`, `user_stats` |
| Révisions « séance du jour » | cartes par état (urgent/fragile/correct/maîtrisé/ancré) + durée | `GET /me/revisions/session` | `srs_cards (user_id, due_at)` |
| Noter une révision | SM-2 → reschedule + transition d'état | `POST /revisions/:cardId/grade` | service `srs` + `review_logs` |
| Examens « L'Épreuve » | briefing, questions, chrono, soumission, résultat+analyse | `POST /exams/:id/sessions`, `POST /sessions/:id/answers`, `POST /sessions/:id/submit`, `GET /sessions/:id/result` | `exams`, `exam_sessions`, `exam_session_questions` |
| Progression « L'ascension » | sceaux dans le temps, jauge par code, radar phases, XP/rang, assiduité | `GET /me/progression` | rollups + `xp_ledger` + `seals` |
| Profil « Dossier du juriste » | rang, mur de sceaux, badges, certifs, stats, historique | `GET /me/profile` | `seals`, `user_badges`, `user_stats` |
| Redeem code d'accès (onboarding) | activation compte/org | `POST /access/codes/redeem` | `access_codes` (idempotent) |
| Admin « Cockpit » | cf. §16 + §24 | `GET /admin/*` | vues matérialisées / rollups |

**Règle** : chaque écran = ≤ 1-2 appels ; les agrégats coûteux sont **précalculés** (jamais N requêtes ni agrégat à la volée).

---

## 21. Diagrammes de flux

### 21.1 Tentative d'apprentissage (chemin critique, sans IA)
```
Client ──POST /learning/attempts──▶ Route (auth+Zod)
   └▶ LearningService.recordAttempt()               [transaction courte]
        ├─ AttemptRepo.insert(attempt)               (append-only, partition mois)
        ├─ ProgressRepo.upsert(user_article_progress) (mastery_score, phase)
        ├─ si phase complétée → emit PhaseCompleted
        └─ si article maîtrisé →
             ├─ SealRepo.grant(seal)
             ├─ XpRepo.append(xp_ledger, +XP)
             ├─ emit ArticleMastered / SealEarned
             └─ enqueue(pgmq): stats.recompute, srs.schedule, notify.send, analytics.rollup
   ◀── { data: { correct, feedback, progress, rewards } }   (réponse immédiate)
Async (worker): user_stats maj ▸ carte SRS créée ▸ notif ▸ événement analytics ▸ invalidation cache /me/*
```

### 21.2 Pipeline IA (jamais deux fois le même contenu)
```
content_admin publie article_version ──▶ emit ArticleVersionPublished
   └▶ enqueue(pgmq): ai.generate { version_id, content_type, prompt_tpl_vN }
Worker ai.generate:
   input_hash = sha256(content_type + version_id + params + prompt_tpl_vN)
   ├─ SELECT ai_generations WHERE input_hash = ? ──HIT──▶ réutilise (0 appel Gemini)
   └─ MISS ▶ lock Redis(input_hash)
             ├─ budget check (jour/mois) — sinon AI_BUDGET_EXCEEDED + alerte + report
             ├─ Gemini.generate() (retry/backoff, timeout)
             ├─ INSERT ai_generations (output, tokens, cost)  + ai_usage
             └─ écrit contenu en status='draft'
content_admin valide ──▶ status='published' ──▶ invalidation cache + servi aux étudiants
```

### 21.3 Examen « L'Épreuve »
```
POST /exams/:id/sessions (Idempotency-Key) ▶ crée exam_session (started_at, snapshot questions)
  ── pendant : POST /sessions/:id/answers (autosave, borné) ─▶ exam_session_questions
  ── POST /sessions/:id/submit ▶ ExamService.grade()  [transaction]
        ├─ score, passed, breakdown (forts/faibles, questions problématiques)
        ├─ si passed → Seal d'examen + XP + emit ExamPassed
        └─ enqueue: analytics.rollup, notify.send
  ── GET /sessions/:id/result ▶ feuille de résultats + recommandations (articles à revoir)
```

### 21.4 Révision (SRS)
```
GET /me/revisions/session ▶ srs_cards WHERE user_id=? AND due_at<=now ORDER BY due_at (keyset)
POST /revisions/:cardId/grade ▶ SrsService.review(grade)
   ├─ SM-2 : ease, interval, reps/lapses → next due_at + nouvel état (urgent→…→anchored)
   ├─ review_logs.append (courbes d'oubli / analytics)
   └─ emit StreakUpdated ▸ user_stats maj (async)
```

### 21.5 File & worker (fiabilité)
```
enqueue (même tx que l'écriture métier) ─▶ pgmq
Cron(1 min) ─▶ /api/internal/worker (secret) ─▶ dequeue(N)
   pour chaque msg: handler(msg)
      ├─ succès ▶ ack (delete)
      ├─ échec & attempts<max ▶ nack + run_after=backoff(attempts)
      └─ échec & attempts=max ▶ status='dead' (DLQ) + alerte
Idempotence: idempotency_key ▸ un même job n'a d'effet qu'une fois.
```

### 21.6 Agrégation Dashboard (1 requête)
```
GET /me/dashboard ▶ DashboardService.get(userId)
   ├─ Redis GET dashboard:{userId} ──HIT──▶ renvoie
   └─ MISS ▶ lit user_stats + srs due count + derniers seals + prochain unlock (rollup)
            ▶ compose DTO ▸ Redis SET (TTL court) ▸ renvoie
Invalidation: ArticleMastered / AttemptRecorded / StreakUpdated ▶ DEL dashboard:{userId}
```

---

## 22. Conventions de développement

- **TypeScript strict** (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`). **Zéro `any`** non justifié par commentaire.
- **Layering imposé** (lint/architecture test) : `app/api` ne peut importer que `server/contracts` + `server/modules/*/service`. Un service n'importe **jamais** HTTP ni `supabase-js` directement (passe par Repository). Import cycliques interdits.
- **DTO** : tout input/output d'API validé par **Zod** ; types dérivés (`z.infer`) exportés depuis `server/contracts`.
- **Erreurs** : taxonomie typée (`AppError` avec `code` stable) ; les services **retournent** des erreurs métier explicites (pas de `throw` de string) ; mapping unique `AppError → HTTP` à la frontière.
- **Repositories** : une classe par agrégat, méthodes intentionnelles (`findDueCards`, `masterArticle`) — pas de « query builder » fuyant dans les services.
- **Transactions** : via unit-of-work ; **courtes** ; jamais d'I/O réseau externe (Gemini/HTTP) dans une transaction ouverte.
- **Idempotence** : mutations sensibles acceptent `Idempotency-Key` ; jobs portent `idempotency_key`.
- **Migrations** : SQL versionné **forward-only**, nommé `NNNN_description.sql`, rev+ testé, réversibilité documentée ; le schéma en Git = source de vérité.
- **Tests** (obligatoires par module) : unitaires (services purs), intégration (repos sur DB éphémère), **tests RLS** dédiés (deny-by-default vérifié), **contrat** (DTO ↔ front), charge (scénarios §1) avant prod.
- **Observabilité by design** : chaque requête a un `request_id` ; chaque job un `job_id` ; logs structurés ; pas de `console.log` en prod.
- **Sécurité** : secrets serveur only ; validation stricte ; deny-by-default ; revue obligatoire des politiques RLS.
- **Commits** : Conventional Commits ; PR petite, une responsabilité ; checklist (tests, RLS, migration, doc, pas de secret).
- **Feature flags** pour activer progressivement (IA, examens, facturation).
- **Definition of Done** : compile, types OK, tests verts, RLS testée, migration appliquée, observable, **aucune régression**.

---

## 23. Décisions d'architecture (ADR)

Format court : *Contexte → Décision → Conséquences → Alternatives écartées*.

- **ADR-001 — Runtime = Next.js Route Handlers (monolithe modulaire).** Contexte : un repo, équipe réduite, besoin de vélocité + scalabilité. Décision : API dans `app/api/v1`, cœur métier isolé dans `server/`. Conséquences : déploiement/scaling serverless gratuits, extraction future d'un service possible (couches portables). Écarté : microservices d'emblée (complexité/ops prématurées).
- **ADR-002 — PostgreSQL (Supabase) comme base unique.** Décision : relationnel + ACID + RLS. Conséquences : intégrité forte, multi-tenant natif, PITR. Écarté : NoSQL (jointures/consistance).
- **ADR-003 — Pooler (Supavisor) transaction mode obligatoire.** Conséquence : pas d'épuisement de connexions en serverless ; transactions courtes imposées.
- **ADR-004 — RLS-first (autorisation en base).** Conséquence : sécurité au plus près de la donnée, défense en profondeur ; coût : tests RLS requis.
- **ADR-005 — File pgmq + worker cron, derrière une abstraction `Queue`.** Conséquence : transactionnel, coût nul, migration QStash/SQS sans refonte. Écarté : Kafka/SQS d'emblée.
- **ADR-006 — Cache & rate limit = Upstash Redis.** Conséquence : serverless-friendly, dédup/verrous IA, quotas. Écarté : Redis auto-hébergé.
- **ADR-007 — Génération IA dédupliquée par `input_hash` (cache partagé).** Conséquence : « jamais deux fois » ; coût marginal ~0 sur contenu partagé. Écarté : génération par utilisateur.
- **ADR-008 — Contenu versionné et immuable une fois publié ; progression liée à `version_id`.** Conséquence : évolutions sans casser l'historique. Coût : jointure de version.
- **ADR-009 — Multi-tenant (`organizations`) dès le schéma initial.** Conséquence : universités/cohortes prêtes ; évite une migration lourde. Coût : `org_id` porté tôt.
- **ADR-010 — Journaux append-only (xp_ledger, review_logs, audit_logs, analytics_events).** Conséquence : auditabilité, reconstruction ; soldes matérialisés dans `user_stats`.
- **ADR-011 — Endpoint agrégé `/me/dashboard` servi depuis `user_stats` + Redis.** Conséquence : dashboard en 1 requête O(1). Écarté : composition de N requêtes côté client.
- **ADR-012 — Partitionnement mensuel des tables chaudes + vues matérialisées pour le cockpit.** Conséquence : montée en charge + admin rapide + rétention par partition.
- **ADR-013 — Contrats DTO partagés (`server/contracts`) importés par le front.** Conséquence : typage bout-en-bout, moins de casse d'intégration.
- **ADR-015 — Moteur par ACTIVITÉS pédagogiques (pas par phase figée).** Contexte : Jurist BF forme un raisonnement, pas un QCM ; il faut des dizaines de formats d'exercices évolutifs. Décision : *Article → Version → Phase (conteneur) → Activités (unités polymorphes) → Interaction → Évaluation → Feedback → Progression*. Une `activity` a un `type` **ouvert** (nouveaux formats **sans migration**), un `prompt` (payload d'affichage), une `weight`, un `objective`. Le frontend est **générique** : il reçoit `{type, prompt}` et le rend via un registre de renderers ; type inconnu → fallback. Conséquences : extensibilité maximale, aucune logique pédagogique dans le front. Écarté : un écran par phase (rigide, non évolutif).
- **ADR-016 — Séparation solution/prompt (sécurité colonne-safe).** Contexte : la RLS filtre par ligne, pas par colonne ; exposer une activité au student ne doit jamais fuiter sa clé de correction. Décision : `activities` (public, `prompt`) vs `activity_solutions` (admin-only : `solution`, `evaluation`, `feedback`). L'évaluation tourne côté serveur (client service-role lit la solution) ; le client ne reçoit le feedback qu'**après** sa tentative. Conséquence : impossible de « tricher » en lisant la réponse ; l'évaluation (score pondéré, confusions, seuil de passage) est 100 % backend, l'IA n'étant qu'un outil d'assistance futur.
- **ADR-014 — i18n-ready (contenu et libellés).** Décision : `notions/articles` prêts pour traductions (colonnes/localisation ou table `*_translations`) sans l'implémenter maintenant. Conséquence : « plusieurs langues » futur sans refonte.

*(Chaque ADR sera maintenu dans `docs/adr/NNNN-*.md` au fil de l'implémentation.)*

---

## 24. Cockpit Admin — catalogue métrique complet

Réservé `admin` (`/admin`, RLS + garde + audit d'accès). Toutes les métriques proviennent de **rollups /
vues matérialisées** rafraîchis par cron (jamais d'agrégat à la volée). Filtres période + pays + université
+ code partout ; export CSV ; alertes configurables.

### 24.1 Business
| Métrique | Définition | Source | Rafraîchi |
|---|---|---|---|
| MRR / ARR | revenu récurrent mensuel / annualisé | `subscriptions`, `invoices` | horaire |
| Chiffre d'affaires | encaissé sur période | `invoices` | horaire |
| Marge | CA − (coût IA + Supabase + Vercel) | `invoices` + `ai_usage` + coûts infra | quotidien |
| Croissance | Δ users/revenu vs période N-1 | rollups | quotidien |
| Abonnements / payants | actifs par plan | `subscriptions` | horaire |
| Churn | % résiliations / période | `subscriptions` | quotidien |
| Rétention (cohortes) | % actifs à J+7/J+30 par cohorte d'inscription | `analytics_events` | quotidien |
| LTV / CAC | valeur vie / coût d'acquisition | invoices + coûts marketing (saisis) | quotidien |

### 24.2 Utilisateurs
DAU/WAU/MAU, nouvelles inscriptions, connexions, progression moyenne, **temps moyen d'étude**, séries
d'étude, répartition **pays / université / code**. Sources : `analytics_events`, `user_stats`,
`user_article_progress` → vues `metrics_active_users`, `metrics_engagement`.

### 24.3 Pédagogie
Progression des étudiants, articles terminés, examens réussis/échoués, **taux de réussite par phase**
(entonnoir 0→4), notions/articles les plus difficiles, **points d'abandon**, **heatmap des difficultés**,
stats d'apprentissage. Sources : `attempts`, `user_phase_progress`, `exam_sessions`, `review_logs` →
vues `funnel_by_phase`, `article_success_rates`, `hard_notions`.

### 24.4 Intelligence Artificielle (contrôle des coûts Gemini)
| Métrique | Source |
|---|---|
| Coût total / quotidien / mensuel | `ai_usage` |
| Coût par utilisateur / par article / par fonctionnalité | `ai_usage` (dims) |
| Tokens (in/out) | `ai_usage` |
| **Cache hit / taux de déduplication** | `ai_generations` (hits vs miss) |
| Jobs IA / retries / DLQ | `ai_jobs` |
| Temps moyen de génération | `ai_jobs` (updated−created) |
**Contrôles** : **budget mensuel + budget quotidien** configurables, **alertes automatiques** aux seuils,
**coupe-circuit automatique** (`AI_BUDGET_EXCEEDED`) qui suspend les générations non essentielles au dépassement.

### 24.5 Infrastructure / Monitoring
État des services, santé des APIs, latence (p50/p95/p99), erreurs, logs, utilisation **PostgreSQL / Redis /
Supabase / Gemini**, quotas, uptime, événements importants. Sources : health checks, Sentry, Axiom,
providers ; agrégés dans `metrics_infra`.

### 24.6 Administration (opérations)
CRUD gérés depuis le cockpit, chaque action **auditée** (`audit_logs`) :
gérer étudiants / administrateurs / organisations / universités / pays / **codes juridiques / articles**,
**publier ou dépublier** du contenu (via versions), gérer **codes d'accès** (lots, activation, expiration),
gérer **abonnements**, consulter le **journal d'audit complet** (recherche/filtre).

> **Séparation stricte** : le cockpit lit des rollups agrégés et écrit via services `admin` à privilèges
> contrôlés ; il n'expose jamais de données à l'app étudiante et toute action sensible est journalisée.

---

# Addendum A — AI Content Generation & Admin Content Studio

> Exigence fondamentale : **l'IA travaille uniquement pour l'administrateur**. Les étudiants consomment
> un contenu **déjà généré et stocké**. Bénéfices : qualité constante, coût IA quasi nul, montée en charge
> illimitée (le coût ne dépend **pas** du nombre d'étudiants). Cet addendum précise et **raffine** §5.2 (structure)
> et §12 (IA).

## A.1 Principe (invariant absolu)
- **Aucun étudiant ne déclenche jamais un appel Gemini.** Le chemin étudiant est 100 % lecture de contenu `published`.
- L'IA est un **outil d'atelier** (Content Studio) réservé aux rôles `admin`/`content_admin`.
- Toute génération est **stockée en PostgreSQL**, validée, puis publiée. Un appel Gemini par article (par version de contenu), **partagé par tous**.

## A.2 Référentiel juridique — arbre flexible (amélioration proposée & justifiée)

Les codes réels n'ont pas tous la même profondeur (Livre/Titre/Chapitre/Section/Sous-section variables). Des
tables rigides (`domains`, `chapters`…) casseraient à l'import d'un code de structure différente. **Amélioration** :
un **arbre générique** remplace la hiérarchie fixe de §5.2.

- `structure_nodes (id, code_id, parent_id?, type ∈ {livre,titre,chapitre,section,sous_section}, label, number, position, path ltree)`
  - Auto-référençant + **`path` (ltree)** pour requêtes de sous-arbre O(index) (« générer pour ce chapitre » = `path <@ node.path`).
  - Profondeur libre → tout code de tout pays s'importe sans changement de schéma.
- `articles (id, code_id, node_id, number, title, position, difficulty, estimated_minutes, current_version_id?)` — l'article est rattaché au **nœud feuille**.
- `notions` **n'est plus structurel** : le libellé/narratif de notion (intro/why/protects/outcomes) devient du **contenu pédagogique généré** attaché à la version d'article (A.5). *(Justification : la « notion » est une lecture pédagogique, pas la structure légale.)*

> Hiérarchie cible : **Pays → Code → Livre → Titre → Chapitre → Section → Sous-section → Article**, réalisée par `countries → legal_codes → structure_nodes(*) → articles`.

## A.3 Workflow Admin — import → parsing → génération → publication

```
[1] IMPORT  (admin)
   Upload PDF/DOCX/TXT ─▶ source_documents (storage + checksum, status=uploaded)
        └▶ enqueue content.parse

[2] PARSING  (worker, déterministe d'abord, IA en secours)
   Extraction texte (pdf/docx/txt) ─▶ détection structure par heuristiques de numérotation
   (Livre/Titre/Chapitre/Section/Sous-section/Article) ─▶ crée structure_nodes + articles
   (chaque article = 1 ligne, official_text isolé)  ─▶ status=parsed
        └▶ REVUE admin (corriger/valider la découpe avant génération)   ◀── humain dans la boucle

[3] GÉNÉRATION  (admin choisit la portée : article | section | chapitre | code)
   Sélection = sous-arbre ltree ─▶ pour chaque article: enqueue content.generate
   Worker content.generate:
        input_hash = sha256(prompt_master_version + sha256(official_text) + content_spec)
        ├─ EXISTE (ai_generations) ─▶ réutilise, 0 appel Gemini
        └─ SINON ─▶ lock ▸ budget check ▸ Gemini (via Prompt Maître) ▸ stocke bundle pédagogique (draft)
                     + ai_generations + ai_usage

[4] VALIDATION ─▶ content_admin relit ─▶ status=published ─▶ invalidation cache ─▶ visible étudiants
```

- **Parsing** : priorité aux règles (numérotation « Article X », « TITRE », « CHAPITRE »… robustes en droit) ; IA d'assistance uniquement si le document est bruité, **côté admin**, mise en cache. La découpe est **revue par un humain** avant génération (qualité constante).
- **Génération par lot** : sélectionner un code entier = enqueue de N jobs (un par article), tous dédupliqués ; barre de progression dans le cockpit.

## A.4 Prompt Maître (source unique, versionné, jamais codé en dur)

- `prompt_templates (id, key, version, body, variables jsonb, model, params jsonb, is_active bool, created_by, created_at)`
  - Le **Prompt Maître** = `key='master'`. Un seul actif à la fois ; historique conservé.
- **`PromptService`** est le **seul** point qui résout le prompt actif et le compose avec les données d'article. Jamais de prompt en dur ailleurs.
- Le `prompt_master_version` entre dans l'`input_hash` → **changer le Prompt Maître crée une nouvelle version** et permet une **régénération explicite et contrôlée** (par article/section/code) sans toucher au reste.
- Édition depuis le cockpit : modifier → nouvelle version → prévisualiser sur 1 article → régénérer la portée voulue. *(La pédagogie de Jurist BF vit dans ce prompt, modifiable en un endroit.)*

## A.5 Contenu pédagogique généré (bundle par version d'article)

Une génération produit **en une fois** le bundle complet, stocké normalisé et attaché à `article_versions`
(chaque item porte `status ∈ {draft,validated,published}`) :
- **Narratif** (sur `article_versions` ou `article_pedagogy`) : `intro`, `why`, `protects`, `outcomes[]`.
- `situations[]` (dont **cas pièges**, avec contexte/personnages/éléments/question/réponse/explication).
- `comprehension_blocks[]` (éléments, conditions, limites, **exceptions**, distinctions, contre-exemples).
- `memorization_items[]` (**texte à trous**).
- `flashcards[]` (`front`, `back`) — **table ajoutée**.
- `exam_questions_bank[]` (**questions + corrigés**, difficulté) → alimente les Examens.

> Tous liés à `article_version_id` → cohérence historique + cache partagé (A.1).

## A.6 Versionnement des codes (régénérer uniquement le modifié)

- Ré-import ou édition d'un code ⇒ **diff par numéro d'article** + comparaison de `sha256(official_text)` :
  - **inchangé** → conserve `article_version` + bundle (0 regénération).
  - **modifié** → nouvelle `article_version` → enqueue génération de **cet article seulement**.
  - **nouveau/supprimé** → créé / archivé.
- Historique complet des versions (structure + contenu) consultable au cockpit. *(« V1 → V2, seuls les articles modifiés sont régénérés. »)*

## A.7 Schéma additionnel (résumé)
- `source_documents (id, code_id?, filename, mime, storage_path, checksum, status, uploaded_by, created_at)`
- `structure_nodes (…)` (A.2, ltree)
- `prompt_templates (…)` (A.4)
- `article_pedagogy (article_version_id pk, intro, why, protects, outcomes jsonb, status)`
- `flashcards (id, article_version_id, front, back, status, position)`
- `generation_batches (id, scope jsonb {node|article|code}, requested_by, total, done, failed, created_at)` — suivi d'un lot de génération dans le cockpit.
- (existants raffinés : `situations`, `comprehension_blocks`, `memorization_items`, `exam_questions_bank` → tous `article_version_id`.)

## A.8 Cockpit — module « Contenu » & « File d'attente » (compléments §16/§24)

- **Contenu** : importer un Code (PDF/DOCX/TXT) · voir tous les Codes · relire/valider la découpe · **générer l'IA** (portée article/section/chapitre/code) · **relancer une génération** · historique des versions · voir les articles générés (draft/validé/publié) · éditer le **Prompt Maître**.
- **File d'attente** : jobs en attente / en cours / terminés / **échoués** · **relancer un job** (DLQ) · profondeur de file · temps moyen · taux d'échec. (adossé à `ai_jobs`/`generation_batches`.)
- **IA** : coût **aujourd'hui / mois**, générations, tokens, **coût par fonctionnalité / utilisateur / Code**, **cache hit / dédup**, **budget mensuel & quotidien**, **coupe-circuit automatique**.

## A.9 Sécurité & coût (rappel)
- Endpoints de génération : rôle `content_admin`+, rate-limités, budget-gated, audités (`audit_logs`).
- `GEMINI_API_KEY` **worker/serveur uniquement**.
- Coût marginal par étudiant = **0** sur le contenu (généré une fois, servi via cache/CDN par `version_id`).

*(Cet addendum est validé pour être intégré au schéma B1 et aux modules `catalog`/`ai`/`admin`.)*
