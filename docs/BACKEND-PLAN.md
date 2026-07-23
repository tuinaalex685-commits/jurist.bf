# Jurist BF — Plan backend (Claude = backend, Gemini = frontend)

> Document d'architecture **backend**. Le frontend (pages, composants, design, UX)
> est de la responsabilité de Gemini. Ce document définit la fondation backend et,
> surtout, **le contrat** que le frontend consomme.

---

## 1. Analyse du PRD — contraintes qui pèsent sur le backend

| Exigence PRD | Conséquence backend |
|---|---|
| Base juridique validée = **unique source de vérité** | `official_text` immuable côté métier ; l'IA ne l'écrit jamais |
| L'IA **n'invente pas** le droit | Le worker IA ne reçoit que du contenu validé en entrée ; prompts bornés au `official_text` + `notion` ; sortie = exercices, jamais de « règle » |
| Contenu montré à l'apprenant seulement s'il est **validé** | Cycle `draft → validated → published` + RLS : l'apprenant ne lit que `published` |
| **Multi-pays / multi-codes** dès le départ | Aucune valeur pays/code en dur ; tout passe par `countries → legal_codes` |
| **Progression individuelle** | Données scopées `user_id` + RLS stricte ; logique de maîtrise côté serveur |
| Parcours actif (reconnaître → comprendre → mémoriser → rappeler/synthèse) | Moteur d'apprentissage = **règles métier serveur** (notation, passage de phase, SRS), pas côté client |
| Plusieurs milliers d'utilisateurs (vision) | Jobs IA **asynchrones** ; lectures cacheables ; index DB ; pas de logique lourde au render |

## 2. Analyse de l'existant + verdict séparation

**Présent :** `database/schema.sql` (13 tables + RLS), `src/lib/config.ts` (identité + constantes de phases), `page.tsx`/`layout.tsx` (placeholders frontend), `.env.local.example`. **Aucune** dépendance backend installée (`@supabase/*`, SDK Gemini absents).

**Verdict séparation :** globalement propre. Seul chevauchement : les pages `src/app/*` que j'ai créées sont du frontend — elles reviennent à Gemini. On formalise la frontière ci-dessous.

## 3. Frontière frontend / backend (ownership)

| Zone | Propriétaire | Contenu |
|---|---|---|
| `src/app/api/**` (Route Handlers) | **Backend (Claude)** | Toute l'API |
| `src/lib/supabase/**` | **Backend** | Clients Supabase (browser / server / admin) |
| `src/lib/server/**` | **Backend** | Règles métier (moteur d'apprentissage, SRS, notation) |
| `src/lib/ai/**` | **Backend** | Client Gemini + prompts + worker |
| `src/lib/contract/**` | **Backend (partagé)** | **Types de requêtes/réponses de l'API** — Gemini importe, ne modifie pas |
| `database/**`, `supabase/**` | **Backend** | Schéma, migrations, seed, RLS |
| `src/app/**` pages, `src/components/**` | **Frontend (Gemini)** | UI, pages, composants, styling, UX |

**Règle d'or :** le frontend **ne parle jamais directement à Supabase pour la logique métier ni les écritures**. Il passe par l'API. Cela garde un contrat stable et me laisse faire évoluer la DB sans casser le frontend.

## 4. Décisions d'architecture backend

- **Contrat = API REST** sous `src/app/api/*` (Route Handlers Next 16) + **types TypeScript partagés** dans `src/lib/contract`. Réponses au format enveloppe `{ data }` / `{ error: { code, message } }`.
- **Auth = Supabase Auth** via `@supabase/ssr` (sessions par cookies, compatibles Server Components / Route Handlers Next 16). Trois clients : *browser* (anon+RLS, pour Gemini si besoin de lectures temps réel), *server* (session utilisateur), *admin* (service role, **serveur uniquement**, jamais exposé).
- **Sécurité = RLS d'abord.** Chaque table applique RLS ; l'API n'est pas la seule barrière. Le service role n'est utilisé que par le worker IA et des tâches admin contrôlées.
- **Rôles** : `profiles.role ∈ {student, admin}`. Trigger de création de profil à l'inscription.
- **IA asynchrone** : table `ai_jobs` + worker (Route Handler protégé par secret, déclenché par l'admin puis par cron). Entrée bornée au contenu validé ; sortie stockée en `draft`.
- **Moteur d'apprentissage côté serveur** : notation des tentatives, calcul du `mastery_score`, passage de phase, planification SRS — jamais côté client (le client pourrait tricher / diverger).

## 5. Roadmap backend (tranches livrables, backend uniquement)

- **B0 — Fondations backend & contrat**
  Installer `@supabase/ssr`/`supabase-js` + SDK Gemini. Clients Supabase (browser/server/admin). Validation d'env. Squelette `src/lib/contract`. Doc d'ownership. *(pas de feature, juste la plomberie)*
- **B1 — Couche données & migrations**
  Passer `schema.sql` en migrations Supabase propres. Trigger `profiles`. Seed source de vérité (BF + Code civil burkinabè + quelques notions/articles). Index.
- **B2 — Auth & sessions**
  Utilitaires de session serveur, protection des routes, gestion des rôles. *(les écrans login/signup sont à Gemini ; je fournis endpoints + helpers + contrat)*
- **B3 — API référentiel (bibliothèque)**
  Lectures : pays, codes, articles, détail article (contenu `published`), recherche. CRUD admin du référentiel.
- **B4 — Moteur d'apprentissage (cœur métier)**
  Récup parcours d'un article (phases 0-3, `published`). Soumission de tentative → notation → mise à jour progression + `mastery_score` + passage de phase. Endpoints de progression (dashboard).
- **B5 — Révisions (SRS)**
  Algorithme de répétition espacée, items dus, soumission de révision.
- **B6 — Synthèse (Phase 4)**
  Génération d'un examen de consolidation à partir de N articles maîtrisés, notation, stockage résultats.
- **B7 — Pipeline IA Gemini**
  Client Gemini + prompts contraints. Worker `ai_jobs`. Génération de `situations` / `comprehension_blocks` / `memorization_items` en `draft` depuis le contenu validé.
- **B8 — Workflow de validation (admin)**
  Endpoints : lister drafts, éditer, `validated`, `published`.

## 6. Décisions à trancher avec l'humain (avant B0)

1. **Mécanisme du contrat** : API REST + types partagés (frontend ne touche jamais Supabase) — recommandé — vs lectures directes Supabase par le frontend (RLS) + API pour les écritures.
2. **Quand brancher Supabase** : créer le projet Supabase dédié maintenant (pour tester auth de bout en bout) ou continuer à écrire migrations/seed en local et appliquer plus tard.
3. **Méthodes d'auth** : email/mot de passe, lien magique, OAuth — lesquelles pour le MVP.
4. **Coordination avec Gemini** : comment on lui transmet le contrat (le dossier `src/lib/contract` + une page de doc des endpoints suffisent-ils ?).
