# Jurist BF — Plan d'architecture (v0)

> **Jurist BF** — SaaS d'apprentissage juridique **actif**, destiné d'abord aux étudiants et
> futurs professionnels du droit au **Burkina Faso**.
> On n'apprend pas un article isolément : on part d'une **situation**, on **comprend** pourquoi
> la règle s'applique, on **mémorise** le texte officiel, puis on **teste** la capacité à
> mélanger plusieurs connaissances.
>
> - **Jurist** → former une vraie capacité de raisonnement juridique, pas seulement mémoriser des textes.
> - **BF** → premier marché et première base juridique = Burkina Faso.
>
> ⚠️ Malgré le « BF », l'architecture reste conçue **multi-pays / multi-codes** dès le départ
> (Pays → Code juridique → Articles → Parcours pédagogique).
>
> Nouveau projet, from scratch. **Aucun** lien de code avec tuina.ai.
>
> Dossier : `C:/Users/Asus/Documents/jurist-bf/`.

---

## 1. Principes non négociables (issus du PRD)

1. Ce n'est **pas** un chatbot juridique.
2. La **base juridique validée** est l'unique source de vérité.
3. L'IA (Gemini) **génère des exercices** à partir du contenu validé — elle **n'invente jamais** le droit.
4. Priorité à l'apprentissage actif : **reconnaître → comprendre → mémoriser → rappeler**.
5. L'architecture supporte **plusieurs pays et plusieurs codes** dès le départ.

## 2. Modèle pédagogique (le cœur)

Parcours par article, en phases :

| Phase | Nom | Objectif | Contenu |
|------|-----|----------|---------|
| **0** | Introduction de la notion | Comprendre le concept général avant les exercices | Texte pédagogique : quelle notion, pourquoi elle existe, quel problème social, situations générales |
| **1** | Reconnaissance par situations | Créer le réflexe *Situation → Notion* | **Plusieurs** situations : simple, intermédiaire, complexe, **piège** (confusion avec notion voisine) |
| **2** | Association / compréhension | Comprendre *pourquoi* l'article s'applique | Éléments constitutifs, conditions, limites, exceptions, distinctions, contre-exemples |
| **3** | Ancrage / mémorisation | Maîtriser le texte officiel exact | Texte à trous, reconstruction progressive, rappel actif, répétition espacée |
| **4** | Synthèse (après N articles) | Tester le mélange des acquis | Cas pratiques mélangés, questions de comparaison, restitution d'articles, score + articles à revoir |

Règle : on n'avance pas parce qu'on a « terminé » — on avance parce qu'on **démontre la maîtrise**.

## 3. Stack technique

- **Next.js** (App Router) — ⚠️ lire `node_modules/next/dist/docs/` avant d'écrire du code (version potentiellement non standard).
- **Supabase** — Postgres + Auth + RLS.
- **Gemini** — génération d'exercices / adaptativité, bornée à la base validée.
- **TypeScript + Tailwind**.
- Déploiement **Vercel**.

## 4. Modèle de données (schéma cible)

### 4.1 Base juridique (référentiel, contrôlé par l'admin)
- `countries` (id, nom, iso)
- `legal_codes` (id, country_id, nom, type, description) — *ex : Code civil burkinabè*
- `notions` (id, nom, slug) — *ex : « abus de confiance »* ; porte l'**intro Phase 0**
- `articles` (id, code_id, notion_id, numero, titre, texte_officiel, ordre)

### 4.2 Contenu pédagogique (généré par IA **puis validé**)
Chaque table porte un `status` : `draft` → `validated` → `published`.
- `situations` (id, article_id, niveau `[simple|intermediaire|complexe|piege]`, scenario, question, bonne_reponse, explication) — Phase 1
- `comprehension_blocks` (id, article_id, type `[elements|conditions|limites|exceptions|distinction|contre_exemple]`, contenu) — Phase 2
- `memorization_items` (id, article_id, cloze_template, blancs[], niveau) — Phase 3

### 4.3 Utilisateur & progression
- Auth via Supabase (`auth.users`)
- `user_article_progress` (user_id, article_id, phase_courante, status, score_maitrise, derniere_vue)
- `user_attempts` (user_id, item_id, item_type, correct, payload, created_at)
- `srs_cards` (user_id, item_id, item_type, ease, interval, due_at) — répétition espacée
- `synthese_exams` (user_id, article_ids[], score, resultats, created_at) — Phase 4

### 4.4 Pipeline de génération IA (asynchrone)
- `ai_jobs` (id, type, payload, status `[pending|running|done|error]`, result, created_at)
- Route worker (`/api/worker/ai`) + polling côté client.
- Flux : admin déclenche la génération pour un article → Gemini → stocké en `draft` → admin **valide** → `published`. Rien n'est montré à l'utilisateur avant validation.

## 5. Structure applicative (routes)

- **Public** : landing, `/login`, `/signup`
- **Dashboard** : progression par code (`35 / 300 articles maîtrisés`)
- **Bibliothèque** : pays → code → articles (recherche + sélection)
- **Apprentissage** : `/learn/[articleId]` — parcours phases 0→3
- **Synthèse** : `/synthese` — examens de consolidation (Phase 4)
- **Révisions** : `/revisions` — items SRS échus
- **Admin** : `/admin` — CRUD référentiel + génération IA + validation contenu

## 6. Périmètre MVP

- **1 pays** (Burkina Faso), **1 code** (Code civil burkinabè), **~10–20 articles**.
- Auth, dashboard progression, bibliothèque.
- Parcours complet phases 0→3 par article.
- SRS de base pour les révisions.
- Synthèse (Phase 4) après N articles maîtrisés.
- Admin pour saisir les articles + générer/valider le contenu pédagogique.

## 7. Roadmap (jalons)

- **M0 — Fondations** ✅ : scaffold Next.js 16 (App Router, Turbopack, TS, Tailwind), `src/lib/config.ts` (identité Jurist BF), landing page brandée, `database/schema.sql` (tables + RLS, prêt à appliquer), `.env.local.example`. Build OK. *Supabase/Gemini pas encore branchés (scaffold local d'abord).*
- **M1 — Base juridique** : admin CRUD articles + bibliothèque + navigation pays/code/article.
- **M2 — Pipeline IA** : `ai_jobs` + worker + génération + écran de validation admin.
- **M3 — Parcours** : phases 0→3 côté apprenant + suivi de progression.
- **M4 — Révisions** : SRS (répétition espacée) + écran révisions.
- **M5 — Synthèse** : Phase 4 (examens de consolidation).
- **M6 — Finition** : dashboard progression, polish UI, déploiement Vercel.

## 8. Décisions ouvertes (à trancher plus tard)

- Algorithme SRS (SM-2 simplifié vs Leitner).
- Seuil exact de « maîtrise » d'un article (score + phases requises).
- Multi-langue de l'UI (FR only au départ ?).
- Modèle de tarification (hors périmètre MVP).
