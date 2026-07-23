# Jurist BF

SaaS d'apprentissage juridique **actif**. On n'apprend pas un article isolément :
on part d'une **situation**, on **comprend** la règle, on **mémorise** le texte
officiel, puis on **teste** ses acquis.

Premier marché et première base juridique : **Burkina Faso** (Code civil burkinabè).
L'architecture reste conçue multi-pays / multi-codes.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + TypeScript + Tailwind
- **Supabase** (Postgres + Auth + RLS) — *à brancher*
- **Gemini** — génération d'exercices depuis la base validée uniquement — *à brancher*

## Démarrer en local

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:3000.

## Structure

- `src/app/` — routes (App Router)
- `src/lib/config.ts` — identité produit + constantes pédagogiques
- `database/schema.sql` — schéma Postgres/Supabase (à appliquer)
- `docs/ARCHITECTURE.md` — plan d'architecture et roadmap
- `.env.local.example` — variables d'environnement (copier vers `.env.local`)

## Principes non négociables

Ce n'est pas un chatbot. La base juridique validée par l'admin est l'unique source
de vérité. L'IA génère des exercices depuis les données validées — elle n'invente
jamais le droit.
