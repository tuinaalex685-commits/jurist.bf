---
name: jurist-bf-frontend-standards
description: Enforce senior-level frontend engineering standards on Jurist.bf (Next.js/TypeScript/TailwindCSS/Supabase), covering component architecture, performance, and accessibility. Use this skill whenever writing, editing, reviewing, or refactoring any frontend code for this project — components, pages, hooks, layouts, forms — even if the user just says "add this feature" or "fix this bug" without asking for a "review" or mentioning "standards" explicitly. Also consult before merging Antigravity-generated frontend diffs.
---

# Jurist.bf — Senior Frontend Standards

Ce skill encadre tout le code frontend du projet Jurist.bf (Next.js 14+ App Router, TypeScript strict, TailwindCSS, Supabase, déployé sur Vercel). Objectif : produire un code de niveau senior — pas juste "qui marche" — sur trois axes : architecture des composants, performance, accessibilité.

À appliquer à chaque écriture/édition/revue de code frontend, y compris sur du code généré par Antigravity qui doit être audité avant d'être accepté.

## 1. Architecture des composants

- **Un composant = une responsabilité.** Si un composant fait du data-fetching ET du rendu complexe ET de la logique métier, le découper : `XxxContainer` (logique/data) → `Xxx` (présentation pure).
- **Server Components par défaut.** `"use client"` uniquement si le composant a besoin de state, d'effets, ou d'event handlers navigateur. Ne jamais mettre `"use client"` "par précaution" en haut d'un fichier.
- **Colocaliser les types.** Types/interfaces d'un composant vivent dans le même fichier ou un `types.ts` adjacent — pas dans un fichier `types.ts` géant global, sauf types réellement partagés (ex: modèles Supabase).
- **Props typées strictement**, jamais de `any`, jamais de `props: any`. Utiliser des types dérivés de Supabase (`Database['public']['Tables']['xxx']['Row']`) plutôt que de redéfinir des interfaces à la main.
- **Composition over configuration** : préférer `children`/slots à des props booléennes qui multiplient les branches conditionnelles (`variant`, `showX`, `showY`... si ça dépasse 3-4 props de ce type, repenser en sous-composants).
- **Custom hooks pour toute logique réutilisée** (`useXxx`) — dès qu'un `useEffect` + `useState` combo apparaît dans 2 composants, l'extraire.
- **Pas de logique métier dans le JSX.** Calculs, formatage, transformations → fonctions pures extraites (utils/ ou dans le hook), le JSX ne fait que du rendu.

## 2. Performance

- **Images** : toujours `next/image`, jamais `<img>` brut. Spécifier `sizes` pour les images responsive, `priority` uniquement pour le LCP (hero au-dessus de la ligne de flottaison).
- **Code splitting** : `next/dynamic` avec `ssr: false` pour tout composant lourd non critique au premier rendu (modales, éditeurs riches, graphiques, tout ce qui touche le SDK Gemini côté client s'il y en a).
- **Memoization ciblée, pas systématique** : `useMemo`/`useCallback`/`React.memo` seulement quand un profiling (ou une intuition forte : liste longue, calcul coûteux, re-render d'un enfant lourd) le justifie — pas par réflexe sur chaque fonction.
- **Éviter les waterfalls de data-fetching** : paralléliser les requêtes Supabase indépendantes (`Promise.all`), ne jamais fetch en cascade quand ce n'est pas nécessaire.
- **Bundle awareness** : pas de librairie lourde importée en entier pour une fonction (import nommé, pas `import * as`). Vérifier qu'aucune dépendance ajoutée n'alourdit significativement le bundle client pour un gain marginal.
- **Cache Gemini-aware** : respecter l'architecture deux couches déjà en place (contenu partagé en cache vs progression par étudiant) — ne jamais dupliquer un appel Gemini côté client qui pourrait être servi depuis le cache partagé.

## 3. Accessibilité

- **HTML sémantique d'abord** : `<button>` pour les actions, `<a>` pour la navigation, `<nav>`, `<main>`, `<section>`, `<h1>`-`<h6>` hiérarchisés — pas de `<div onClick>` pour un élément interactif.
- **Focus visible et navigable au clavier** : tout élément interactif doit être atteignable au Tab et avoir un état focus visible (ne jamais faire `outline: none` sans remplacer par un style de focus équivalent).
- **Attributs ARIA seulement quand le HTML sémantique ne suffit pas** — ne pas ajouter `role="button"` sur un `<div>` si un `<button>` stylé fait le travail nativement.
- **Formulaires** : chaque `<input>` a un `<label>` associé (ou `aria-label` explicite), messages d'erreur liés via `aria-describedby`, état de chargement/soumission annoncé (`aria-busy` ou live region).
- **Contraste** : dans la direction design luxe (navy sombre, or champagne, violet électrique), vérifier que le texte sur fond sombre reste au-dessus du seuil WCAG AA (4.5:1 pour le texte courant) — l'esthétique ne doit jamais faire chuter la lisibilité sous ce seuil.
- **Contenu dynamique** (streaming Gemini, corrections IA, remédiation) : annoncer les changements de contenu importants via une live region (`aria-live="polite"`) pour les lecteurs d'écran, plutôt que de compter uniquement sur le rendu visuel.

## 4. Discipline de revue (spécifique à ce projet)

- **Scope-locking** : Antigravity a tendance à modifier des fichiers hors périmètre. Avant d'accepter un diff, vérifier qu'il ne touche que les fichiers/composants concernés par la demande.
- **TypeScript strict, zéro `any` accepté sans commentaire justificatif.**
- Signaler explicitement dans la revue tout point qui viole un des axes ci-dessus, avec la ligne concernée — ne pas se contenter d'un "ça a l'air bien".

## Exemple de revue rapide

Quand on relit un composant, se poser dans l'ordre :
1. Est-ce un Server ou Client Component, et ce choix est-il justifié ?
2. Y a-t-il un problème d'architecture (responsabilité mélangée, logique dans le JSX) ?
3. Y a-t-il un problème de performance évident (image brute, fetch en cascade, memoization manquante sur une liste longue) ?
4. Le composant est-il utilisable au clavier et par un lecteur d'écran ?

Si un point échoue, le signaler précisément plutôt que de réécrire silencieusement tout le composant.
