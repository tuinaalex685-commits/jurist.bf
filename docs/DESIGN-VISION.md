# Jurist BF — Vision Produit & Direction Artistique

> Document de **Head of Product Design**. Aucune ligne de code n'est écrite avant validation
> de cette vision. Objectif : passer d'un « joli template SaaS » à une **identité unique et
> immédiatement reconnaissable** — l'impression d'entrer dans une **académie juridique numérique**.

---

## 0. Le constat

L'app actuelle est propre, moderne, bien codée — mais **interchangeable**. Retire le logo : on croirait
un CRM, une néobanque, un outil RH. Elle **informe** mais ne **transforme** pas l'utilisateur.

Le problème n'est pas « le dark » ou « le light ». Le problème est **l'absence d'âme et de récit**.
Un produit reconnaissable naît de 4 choses, pas d'une couleur :

1. une **métaphore forte** qui structure toute l'expérience,
2. une **typographie signature** (les SaaS génériques sont 100 % sans-serif),
3. des **motifs visuels propres au droit** (sceau, balance, dossier, codex),
4. une **progression ritualisée** (grades, sceaux, cérémonies de passage).

---

## 1. Le concept directeur — « L'Académie »

**Jurist BF n'est pas une application. C'est une académie.**

L'utilisateur n'est pas un « user ». C'est un **apprenti juriste** qui gravit les rangs vers la
**Maîtrise**. Le produit s'adresse à lui comme un **maître à son élève** : exigeant, respectueux,
motivant.

- **Positionnement** : « L'académie qui forme les meilleurs juristes d'Afrique. »
- **Promesse** : à chaque session, tu progresses **réellement** vers la maîtrise du droit — et tu le **vois**.
- **Ton de voix** : sobre, prestigieux, mentor. Jamais gadget, jamais corporate tiède.
  - ✅ « Vous maîtrisez désormais l'article 613-1. Il rejoint votre arsenal. »
  - ❌ « Bravo 🎉 Continuez comme ça ! »

### La métaphore spatiale (élément différenciant #1)
L'app se vit comme un **lieu**, pas un tableau de bord :
- On circule dans des **Halls** sombres et prestigieux (navigation, dashboard, bibliothèque, examens).
- On entre dans la **Salle d'étude**, surface claire type **parchemin**, quand on lit/travaille un texte de loi (lisibilité maximale, révérence pour le texte officiel).

Ce contraste **Halls sombres ↔ Étude claire** est la **signature** de Jurist BF. Il résout aussi la
tension des itérations précédentes : le prestige du sombre **et** le confort de lecture du clair,
mais **avec une intention**, pas par hasard.

---

## 2. Principes UX (nos 5 lois)

1. **Prestige, pas corporate.** Chaque écran doit sembler « mérité ». On vise le ressenti d'un lieu d'excellence.
2. **Progression tangible.** L'utilisateur voit toujours : où il en est, ce qu'il lui reste, ce qu'il débloque ensuite.
3. **Le droit est sacré.** Le texte officiel est traité avec révérence (typo serif, surface parchemin, sceau). On ne « scrolle » pas la loi, on l'**étudie**.
4. **La récompense se mérite.** L'**or** est rare : réservé aux sceaux, badges, certifications, examens réussis. Sa rareté fait sa valeur.
5. **Fluidité cérémonielle.** Les transitions (passage de phase, obtention d'un sceau) sont des **moments**, pas de la décoration.

---

## 3. Langage visuel signature

Motifs propres à Jurist BF, réutilisés partout pour créer la reconnaissance immédiate :

- **Le Sceau (⬤ doré)** — médaillon/cachet de cire stylisé. Symbole de **maîtrise/certification**. Objet-signature du produit (obtenu à la fin d'un article, collectionnable).
- **La Balance** — motif de marque dans les moments forts (splash, examen, cérémonie), animée avec équilibre.
- **Le Dossier** — esthétique « pièce de dossier » pour les cas pratiques (onglet, cote, personnages).
- **Le Codex** — la bibliothèque comme une **étagère de codes**, chaque code = un ouvrage à la tranche gravée.
- **Les Grades** — insignes de rang (V, chevrons, laurier) marquant la progression.
- **La Référence** — numéros d'articles en **mono gravé** (ex. `Art. 613-1`), traités comme des cotes juridiques.

---

## 4. Design System

### 4.1 Palette
Base demandée : **bleu nuit · émeraude · doré · noir profond · gris clair**. Application raisonnée :

| Token | Rôle | Indication |
|---|---|---|
| **Encre** (noir profond bleuté) | Fond des Halls | `#0A0E17` env. — jamais #000 pur |
| **Nuit** (bleu nuit) | Surfaces sombres, cartes des Halls | `#111A2E` env. |
| **Nuit clair** | Cartes surélevées, hover | `#18233D` env. |
| **Émeraude** | **Action / progression / justice** | `#0E9F6E`→`#34D399` — la couleur qui « fait avancer » |
| **Or** (doré champagne) | **Récompense uniquement** : sceaux, badges, certifs, examens réussis | `#D9B45B`/`#E7C878` — RARE |
| **Parchemin** | Surface de la Salle d'étude (lecture du droit) | `#F6F1E7` env. — chaud, pas blanc froid |
| **Ardoise** (gris clair) | Texte secondaire, bordures | échelle de gris bleutés |
| Feedback | Émeraude = succès · **Ambre** = à réviser/urgent · **Rubis** = erreur/piège | usage strictement sémantique |

**Règle d'or (littéralement)** : si ce n'est pas une récompense méritée, **ce n'est pas doré**. Un
bouton d'action normal est **émeraude**, jamais or.

### 4.2 Typographie (élément différenciant #2)
On casse le « tout sans-serif » générique par un **système à 3 voix** :

- **Serif d'apparat** (titres, marque, moments forts) — ex. **Fraunces** ou **Newsreader**. Donne l'ADN « droit/prestige ».
- **Sans UI** (interface, labels, boutons) — ex. **Inter** / **Geist**. Neutre, lisible, moderne.
- **Serif de lecture** (texte officiel de loi, dans la Salle d'étude) — serif humaniste, confort de lecture long.
- **Mono gravé** (numéros d'articles, cotes, data) — ex. **IBM Plex Mono** / **Space Mono**.

Le simple fait d'avoir un **serif d'apparat** en titres suffit à sortir du « template SaaS ».

### 4.3 Surfaces & profondeur
- **Halls** : fond Encre, cartes Nuit avec **bordure fine lumineuse** (1px ardoise/8 %), léger **grain** et halos émeraude/or très diffus → profondeur, jamais plat.
- **Étude** : surface Parchemin, ombres douces, colonne de lecture étroite (mesure ~66 caractères), typo serif.
- **Verre** réservé aux éléments flottants (barre de mission, modales, notifications).
- **Rayons** cohérents : cartes `1rem`, éléments `.75rem`, pastilles `full`. Un seul langage d'arrondi.

### 4.4 Iconographie & illustrations (élément différenciant #4)
- **Icônes** : set cohérent (Lucide) **+** un jeu de **glyphes juridiques maison** (balance, sceau, colonne, marteau, parchemin, code) en SVG, style trait fin bicolore émeraude/or.
- **Illustrations** : style **line-art doré/émeraude sur fond nuit** pour les héros de phase, états vides et cérémonies. **Aucun asset téléchargé sans ton accord** — je propose de les produire en **SVG maison** (unique, léger, cohérent) plutôt qu'une banque d'images générique.
- **Objectif** : chaque écran a au moins **un** élément dessiné qui ne pourrait exister que dans une app de droit.

### 4.5 Grille & rythme
Grille bento cohérente, densité maîtrisée (moins de vide que Revizion, plus de hiérarchie), espacement sur une échelle 4/8, alignements stricts.

---

## 5. Gamification — le moteur de motivation

Système unifié, sobre (pas « Duolingo enfantin », mais **Duolingo dans la rigueur d'un cabinet**) :

- **Grades (5 rangs)** avec insigne : **Néophyte → Initié → Praticien → Plaideur → Maître**. Chaque rang débloqué = cérémonie.
- **Points de Maîtrise (XP)** gagnés en complétant phases, révisions, examens.
- **Sceaux** : 1 sceau doré par article **maîtrisé** → collection visible dans le Profil (mur de sceaux).
- **Série d'assiduité** (streak) : jours consécutifs d'étude, avec « bouclier » anti-rupture.
- **Objectifs** : quotidien (ex. « 1 révision + 1 phase ») et hebdo, avec anneau de complétion.
- **Badges/Distinctions** : jalons (1er sceau, 10 articles, mémorisation parfaite, examen sans faute, 30 jours de série).
- **Déblocages** : le prochain code / le prochain examen s'ouvre à un seuil → l'utilisateur voit **ce qui l'attend** (motivation par anticipation).
- **Classement** (option V2) : ligue anonyme entre apprenants d'un même code.

---

## 6. Inventaire de composants

- **Boutons** : `primaire` (émeraude), `récompense` (or, réservé), `fantôme`, `contour`, `danger`.
- **Cartes** : `hall` (sombre), `étude` (parchemin), `sceau`, `stat`, `objectif`, `déblocage`.
- **Pastilles/chips** : rang, difficulté (simple/piège…), statut (maîtrisé/à revoir/verrouillé), « généré par IA ».
- **Progression** : barre linéaire, **anneau** (objectifs), **jauge de maîtrise** par article, **carte de mission** (stepper 5 phases).
- **Le Sceau** (composant signature) : médaillon animé (estampage).
- **Insigne de rang**, **compteur animé** (count-up), **flamme de série**, **toast XP**.
- **Chronomètre d'examen**, **barre de danger**, **feuille de résultats**.
- **États vides** thématisés, **skeletons** à l'identité, **notifications** (centre + toasts).

---

## 7. Navigation & architecture

- **Barre latérale (les Halls)** : Tableau de bord · Bibliothèque · Révisions · Examens · Progression · Profil. En bas : rang + série + objectif du jour.
- **En-tête** : recherche globale (⌘K, « invoquer un article »), série, notifications, avatar/rang.
- **Mode focus** : le Parcours et l'Examen **masquent** la navigation (immersion, comme entrer dans une salle).
- **⌘K Command Palette** (touche Arc/Linear) : sauter à un article, lancer une révision, ouvrir un code → sensation « pro ».

---

## 8. Écrans (objectif · récit · hiérarchie · gamif · état vide · animations)

### 8.1 Onboarding — « L'admission »
- **Objectif** : poser le récit + choisir pays/code + fixer un objectif.
- **Récit** : cérémonie d'entrée à l'académie, remise du 1er grade (Néophyte).
- **Écrans** : accueil (marque + balance animée) → choix pays/code → objectif quotidien → 1re notion offerte.
- **Anim** : la balance s'équilibre, le grade Néophyte s'estampe.

### 8.2 Dashboard — « Le Poste de commandement »
- **Objectif** : en 5 s, comprendre où j'en suis, quoi faire aujourd'hui, mon but, ce qu'il me reste, ce que je débloque.
- **Hiérarchie** (haut → bas) :
  1. **Bandeau de rang** : insigne + progression vers le rang suivant + série.
  2. **« Votre mission du jour »** (bloc dominant) : action n°1 recommandée (reprendre un article / révisions urgentes) + objectif du jour (anneau).
  3. **Ce qu'il vous reste** : jauge globale du code en cours (ex. 35/300) + estimation « à ce rythme, Maîtrise dans X ».
  4. **Prochain déblocage** : carte « À débloquer » (prochain examen/sceau) → anticipation.
  5. **Révisions** (ambre) + **dernier sceau obtenu** (or).
- **Motiver > informer** : chaque stat est reliée à une **action** ou une **récompense à venir**.
- **État vide** (J1) : « Votre parcours commence » + 1 CTA unique.
- **Anim** : compteurs count-up, anneau d'objectif qui se remplit, pulsation douce sur l'action prioritaire.

### 8.3 Bibliothèque — « Le Codex »
- **Objectif** : donner **envie d'explorer** ; montrer progression, maîtrisés, récents, niveau, domaines.
- **Récit** : une étagère d'ouvrages de loi ; chaque **code = un tome** à la tranche gravée (couleur par matière).
- **Hiérarchie** : pays sélectionné → grille de **tomes** (progression sur la tranche) → au clic, vue **tome ouvert** : domaines/notions, articles avec statut (maîtrisé ⬤or / en cours / verrouillé), « derniers étudiés », niveau atteint.
- **État vide** : tome « à venir » verrouillé avec cadenas élégant.
- **Anim** : ouverture du tome (transition spectaculaire), tranche qui se remplit.

### 8.4 Parcours d'apprentissage — « La Mission » (5 phases)
- **Objectif** : ne jamais donner l'impression de lire un PDF ; ressentir la progression.
- **Mode focus** (nav masquée) + **carte de mission** (stepper coloré par phase) déjà en place, à sublimer.
- **Identité par phase** (couleur + icône + rituel d'entrée) :
  - **0 Découverte** (ciel) — héro illustré, « pourquoi/que protège/ce que tu sauras ».
  - **1 Reconnaissance** (indigo) — **dossiers** juridiques à analyser.
  - **2 Compréhension** (émeraude) — **blocs** de raisonnement.
  - **3 Mémorisation** (violet) — texte à trous, score, révélation du texte officiel (**surface Parchemin**).
  - **4 Maîtrise** (or) — **estampage du Sceau** + confettis or, grade/XP gagnés.
- **Passage de phase spectaculaire** : transition plein écran ½ s (couleur de la phase qui balaie, titre de phase, son optionnel), pas un simple fondu.
- **Anim** : estampage du sceau (scale + rotation + éclat), count-up du score, déverrouillage phase suivante.

### 8.5 Révisions — « La séance du jour »
- **Objectif** : mission quotidienne ; voir d'un coup l'urgent, le presque-oublié, le parfaitement su.
- **Récit** : « Le maître a préparé votre séance. »
- **Hiérarchie** : 3 colonnes/piles d'état de mémoire —
  - 🔴 **Urgent** (sur le point d'être oublié),
  - 🟠 **Fragile** (à consolider),
  - 🟢 **Ancré** (parfaitement mémorisé).
  Un CTA unique « Démarrer la séance » (ambre) + estimation de durée.
- **État vide** : « Tout est ancré aujourd'hui. Revenez demain. » (illustration sereine).
- **Anim** : cartes qui migrent d'une pile à l'autre après réponse (mémoire qui se renforce visuellement).

### 8.6 Examens — « L'Épreuve » (interface distincte)
- **Objectif** : ressentir une **vraie épreuve**, solennelle, différente de tout le reste.
- **Interface radicalement différente** : plein écran, fond Encre profond, nav masquée, ambiance « salle d'examen ».
- **Avant** : écran de briefing (matières couvertes, difficulté, durée, enjeu/récompense — un **Sceau d'Examen doré**).
- **Pendant** : **chronomètre** proéminent, barre de progression des questions, palette de navigation, montée de tension visuelle sur les dernières minutes.
- **Après** : **feuille de résultats** (score, temps, points forts/faibles), **analyse détaillée** question par question, récompense (badge/sceau si réussi), conseils du « maître » sur quoi revoir.
- **Anim** : ouverture cérémonielle (rideau/balance), révélation du score, cachet « ADMIS » doré.

### 8.7 Progression — « L'ascension »
- **Objectif** : visualiser le chemin vers la Maîtrise.
- **Composants** : courbe/heatmap d'assiduité, jauge par code, chronologie des sceaux, projection (« Maîtrise estimée le … »), forces/faiblesses par phase.

### 8.8 Profil — « Le Dossier du Juriste »
- **Objectif** : fierté + identité.
- **Composants** : insigne de **rang**, **mur de sceaux** (collection dorée), **badges/distinctions**, série record, statistiques clés, pays/codes suivis. Sensation de « CV juridique vivant ».

### 8.9 Badges & Sceaux — « La Salle des distinctions »
- Galerie des badges (obtenus/à obtenir avec condition), sceaux collectionnés, prochaine distinction à portée.

### 8.10 Notifications
- **Centre** (les « convocations du maître ») + **toasts** discrets (XP, série, déblocage).
- Types : révisions dues, série en danger, examen débloqué, nouveau sceau, objectif atteint.

### 8.11 États vides (principe transverse)
Jamais un vide gris : toujours **illustration maison + une phrase de mentor + un seul CTA**. Le vide devient une **invitation**.

---

## 9. Animations & micro-interactions (catalogue)

- **Cérémonies** (rares, fortes) : passage de phase, estampage de sceau, montée de grade, résultat d'examen. Confettis **or** réservés à ces moments.
- **Micro** (partout, subtiles) : hover-lift des cartes, pression des boutons, count-up des chiffres, flamme de série, remplissage des anneaux/jauges, apparition en cascade (stagger).
- **Transitions d'écran** : partagées et fluides (`transform`/`opacity` uniquement — pas de reflow), sensation Arc/Linear.
- **Feedback immédiat** : chaque action a une réponse visuelle < 100 ms.
- **Chargement** : skeletons à l'identité (jamais un spinner nu) ; splash de marque (balance) au démarrage.

---

## 10. Dashboard ADMIN — « Le Cockpit » (accès réservé au propriétaire)

Interface **séparée** (`/admin`), **gated** : accessible uniquement à ton compte (rôle `admin`,
protégé par RLS + garde de route). Style **analytics pro** (pense Stripe Dashboard / Vercel Analytics),
distinct de l'app apprenant. Objectif : **piloter la rentabilité et la santé du SaaS**.

### 10.1 Vue d'ensemble (KPIs en tête)
- **MRR / ARR**, revenu net, croissance %, **marge** (revenu − coûts IA − infra).
- **Utilisateurs actifs** (DAU/WAU/MAU), nouveaux, **churn**, rétention.
- **Coût IA total** (Gemini) sur la période + **coût par utilisateur** + **coût par article généré**.
- **Codes d'accès** : générés / activés / restants.

### 10.2 Rentabilité & finances
- Courbe **Revenu vs Coûts** (IA + Supabase + Vercel) → marge dans le temps.
- **LTV / CAC**, revenu par pays/code, par plan.
- Alertes : marge sous seuil, pic de coût IA.

### 10.3 Coûts IA (Gemini) — critique
- Tokens consommés & **coût par fonctionnalité** (génération situations / compréhension / mémorisation / examens).
- Coût par **job** IA, coût moyen par utilisateur actif, tendance.
- **File des jobs IA** : en attente / en cours / réussis / **échoués** (avec relance), latence, taux d'échec.
- Garde-fous : budget mensuel, quota par utilisateur, alerte de dépassement.

### 10.4 Utilisateurs
- Table : inscription, pays, code, rang, dernière activité, articles maîtrisés, coût IA généré.
- **Cohortes de rétention**, entonnoir d'activation, répartition par pays/code.

### 10.5 Codes d'accès (packaging de distribution)
- Génération de lots, suivi d'activation, expiration, attribution (école/promo/campagne), taux de conversion par lot.

### 10.6 Contenu & pédagogie
- Articles publiés / en `draft` / à valider, couverture par code, articles les plus/moins réussis.
- **Entonnoir du parcours** : % qui terminent chaque phase (0→4), points d'abandon → où le produit perd les gens.

### 10.7 Santé système
- Erreurs, latence API, quotas **Supabase / Gemini / Vercel**, uptime, événements récents.

> **Sécurité** : le cockpit admin n'expose **jamais** de données à l'app apprenant ; requêtes serveur
> à privilèges élevés, RLS strict, une seule identité admin (toi). Filtres par période partout,
> export CSV, alertes configurables.

---

## 11. Après validation — ordre d'implémentation proposé

1. **Design tokens & fonts** (palette Halls/Étude, serif d'apparat, mono) + composant **Sceau** + **Insigne de rang**.
2. **Shell** (Halls) : sidebar/‌header à l'identité + ⌘K.
3. **Dashboard** « Poste de commandement ».
4. **Parcours** en mode focus + cérémonies de phase + estampage du sceau.
5. **Bibliothèque** (Codex) → **Révisions** (séance) → **Examens** (Épreuve).
6. **Profil / Progression / Badges**.
7. **Dashboard Admin** (cockpit) — en parallèle, écran isolé.
8. Illustrations SVG maison + polish animations.

(Tout en frontend/mock d'abord ; le backend + l'IA se branchent à la fin, avec ta clé.)

---

## 12. Décisions à valider avant que je code

1. **Direction artistique** : je propose le système **Halls sombres (bleu nuit/or) ↔ Salle d'étude claire (parchemin)**. Tu valides ce dual-surface, ou tu veux **tout sombre** ou **tout clair** ?
2. **Typographie d'apparat** : serif prestige en titres (Fraunces/Newsreader) — OK ? (c'est le plus gros levier anti-« template »).
3. **Métaphore « Académie »** (grades, sceaux, cérémonies, ton mentor) : on l'assume à fond, ou version plus sobre ?
4. **Illustrations** : SVG maison (unique, recommandé) vs banque d'assets à choisir ensemble.
5. **Portée du 1er lot** : je te livre d'abord une **maquette visuelle d'un écran** (Dashboard) pour voir l'identité avant d'implémenter le reste ?
