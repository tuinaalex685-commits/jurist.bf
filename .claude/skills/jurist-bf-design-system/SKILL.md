---
name: jurist-bf-design-system
description: Enforce the Jurist.bf (Tuina.ai) 2026 luxury design direction — dark navy base, champagne gold and electric violet accents, glassmorphism, bento grid layout, Clash Display/Space Mono typography. Use this skill whenever writing, editing, or reviewing any UI/frontend code that touches visual output — colors, spacing, layout, typography, cards, buttons, animations — for this project, even if the user just asks to "add a button" or "style this page" without mentioning "design" explicitly.
---

# Jurist.bf — Design System Premium

Direction design établie pour Jurist.bf/Tuina.ai : esthétique "luxe 2026", pas institutionnel, pas SaaS générique bleu-blanc. Ce skill garantit que tout élément visuel généré respecte cette direction et le ressenti "premium fluide" — jamais un look template par défaut.

## 1. Palette

- **Fond** : navy quasi noir (très sombre, jamais un gris neutre plat ni un noir pur #000). Toute nouvelle surface doit rester dans cette gamme de fond sombre — ne jamais introduire un fond blanc/clair sauf composant spécifique qui l'exige (ex: contenu imprimable).
- **Accent primaire** : or champagne — réservé aux éléments d'action principale, highlights, bordures actives. Ne pas le diluer en l'utilisant partout (texte courant, fonds larges) — un accent perd sa valeur s'il est omniprésent.
- **Accent secondaire** : violet électrique — pour les états interactifs secondaires, focus states, éléments IA/génératifs (ex: badges "généré par IA", indicateurs de streaming Gemini).
- **Jamais de palette Tailwind par défaut telle quelle** (`bg-blue-500`, `bg-gray-100`, etc.) sans passer par les tokens du design system définis dans `tailwind.config` / variables CSS du projet. Si un token manque pour un cas d'usage, le signaler plutôt que d'improviser une couleur Tailwind générique.

## 2. Glassmorphism

- Les panneaux/cartes utilisent un effet verre : fond semi-transparent + `backdrop-blur` + bordure fine claire/translucide — pas d'ombres portées lourdes façon Material Design classique.
- Épaisseur et opacité du flou doivent rester subtiles : l'effet verre sert à créer de la profondeur, pas à rendre le contenu illisible. Toujours revérifier le contraste texte/fond après un glassmorphism (cf. skill accessibilité — seuil WCAG AA).
- Les éléments flottants (modales, dropdowns, tooltips) sont les candidats naturels au glass ; le contenu texte long/dense (article, cours) reste sur un fond plus stable pour la lisibilité.

## 3. Layout — Bento grid

- Organiser les sections en grille "bento" : blocs de tailles variées mais alignés sur une grille cohérente, pas une simple liste verticale uniforme ni un grid classique à cellules toutes identiques.
- Chaque bloc bento a une fonction claire (une stat, une action, un aperçu de contenu) — éviter de surcharger un seul bloc avec plusieurs informations sans lien.
- Espacement cohérent entre les blocs (rythme constant), coins arrondis harmonisés sur toute l'interface (même rayon partout, pas un mix de rayons différents selon les composants).

## 4. Typographie

- **Titres / éléments de marque** : Clash Display.
- **Texte technique, code, données chiffrées, métadonnées** : Space Mono.
- Ne pas mélanger d'autres familles de police non prévues dans le système (pas de police système par défaut qui casserait la cohérence) — si une police tierce semble nécessaire pour un cas précis, le signaler plutôt que l'ajouter silencieusement.
- Hiérarchie typographique nette : les titres doivent visuellement se distinguer du corps de texte en poids ET en taille, pas seulement en taille.

## 5. Mouvement et fluidité ("premium fluide")

- Transitions douces sur les interactions (hover, ouverture de panneau, changement d'état) — jamais de changement d'état instantané et sec sur un élément interactif visible.
- Pas d'animation qui bloque l'interaction utilisateur : toute transition doit rester courte (perception de réactivité immédiate) même si elle est visuellement douce.
- Éviter le jank : les animations de layout (bento grid qui se réorganise, cartes qui apparaissent) doivent utiliser `transform`/`opacity` plutôt que des propriétés qui déclenchent un reflow (`width`, `height`, `top`, `left`) — c'est aussi ce qui garantit la fluidité perçue.
- Le motif de marque (balance de la justice en rendu verre, rotative) est un élément signature — le traiter comme un moment de marque (chargement, page d'accueil), pas comme une icône décorative reproduite partout.

## 6. Anti-patterns à signaler explicitement

Si un de ces éléments apparaît dans le code review, le signaler précisément plutôt que de le corriger en silence :
- Fond blanc/clair par défaut d'un composant UI standard non adapté au thème sombre.
- Bouton ou carte avec ombre portée classique au lieu de l'effet verre.
- Grille de cartes toutes identiques en taille (ce n'est pas un bento).
- Police système par défaut ou police non listée ci-dessus.
- Accent or/violet utilisé comme couleur de fond large au lieu d'un highlight ciblé.

## Exemple de revue rapide

Avant de valider un composant visuel :
1. Le fond respecte-t-il la base navy sombre ?
2. Les accents (or/violet) sont-ils utilisés avec parcimonie et à bon escient ?
3. L'effet verre est-il appliqué où c'est pertinent (panneaux flottants) sans casser la lisibilité ?
4. La typographie suit-elle Clash Display / Space Mono selon le contexte ?
5. Les transitions sont-elles douces et basées sur transform/opacity ?

Ce skill se lit en complément de `jurist-bf-frontend-standards` (architecture, performance, accessibilité) — les deux ensemble couvrent code ET rendu visuel.
