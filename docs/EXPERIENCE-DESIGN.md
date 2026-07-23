# Jurist BF — Conception d'Expérience Produit (écran par écran)

> Complément opérationnel de [`DESIGN-VISION.md`](./DESIGN-VISION.md) (qui fixe l'identité et le
> design system). Ici on ne décrit pas des **pages** mais des **expériences**. Chaque écran répond
> à **3 questions** — *objectif pédagogique · émotion visée · action principale* — et chaque
> composant est justifié par un **pourquoi**. Aucune implémentation avant validation.

---

## Le fil rouge émotionnel

Jurist BF n'est pas un outil qu'on « utilise », c'est un lieu où l'on **progresse**. L'app orchestre
une émotion par moment de la journée :

| Écran | Émotion cible | Ce que l'écran déclenche |
|---|---|---|
| Dashboard | **Clarté & élan** | « Je sais exactement quoi faire, et ça vaut le coup. » |
| Bibliothèque | **Curiosité & convoitise** | « Je veux ouvrir ce tome, débloquer cette notion. » |
| Parcours | **Immersion & montée** | « J'avance vers quelque chose, je ne lis pas un PDF. » |
| Révisions | **Contrôle & soin** | « Je consolide, je vois ma mémoire se renforcer. » |
| Examens | **Tension & fierté** | « C'est une vraie épreuve. Je l'ai passée. » |
| Progression | **Recul & projection** | « Je vois le chemin parcouru et la cible. » |
| Profil | **Fierté & identité** | « Voici le juriste que je deviens. » |

Principe transverse : **chaque carte mène à une action ou promet une récompense**. Aucune statistique
« morte ». Si un chiffre n'appelle ni un geste ni une convoitise, il ne mérite pas sa place.

---

## 1. Dashboard — « Le Poste de commandement »

**🎓 Objectif pédagogique** : orienter l'effort du jour vers ce qui fait le plus progresser (révisions dues, phase en cours, point faible).
**❤️ Émotion visée** : clarté immédiate + élan (« j'ai envie de m'y mettre »).
**🎯 Action principale** : lancer **la** tâche recommandée (un seul bouton dominant : *Continuer* / *Démarrer la mission*).

### Informations prioritaires (dans l'ordre de lecture)
1. Qui je suis aujourd'hui (salutation + rang + série).
2. Ma **mission du jour** (2-3 tâches concrètes + récompense).
3. Où je reprends **exactement** (article + phase).
4. Où j'en suis globalement (jauge du code + estimation Maîtrise).
5. Ce que je débloque bientôt (anticipation).
6. Mes faiblesses / mes forces (métacognition).
7. Ce qui presse (révisions urgentes).
8. Mes dernières récompenses (sceaux) + progression de rang.

### Hiérarchie visuelle (haut → bas)
- **Bandeau d'accueil** : « Bonjour, Maître Tuina. » (serif d'apparat) + insigne de **rang** + **flamme de série**.
  - *Pourquoi* : personnalisation + statut immédiat ; la série crée l'habitude (peur de la rompre).
- **Carte MISSION DU JOUR** (bloc dominant, pleine largeur) :
  - Liste de 2-3 objectifs cochables : « Réviser 5 articles », « Terminer la phase Compréhension », « Réussir l'examen quotidien ».
  - **Récompense affichée** : `+250 XP`, `+1 Sceau`.
  - Anneau de complétion du jour + CTA unique.
  - *Pourquoi* : transforme un tableau de bord passif en **feuille de route**. La récompense visible crée l'engagement (motivation par anticipation). Le seul CTA dominant supprime la paralysie du choix.
- **Reprendre où je me suis arrêté** (carte « continuité ») : Article 613 · Phase 2 Compréhension · miniature de progression · `[Continuer]`.
  - *Pourquoi* : supprime la friction de « par où je recommence ? » — la reprise en 1 clic est le geste #1 d'un apprenant qui revient.
- **Progression du code en cours** : `Code pénal — 145/520` + barre + **estimation** « À ce rythme : Maîtrise dans ~14 semaines ».
  - *Pourquoi* : donne un **cap** ; l'estimation rend l'objectif tangible et pilotable.
- **Bento 2 colonnes** :
  - **Ce que vous allez débloquer** : `🔒 Examen Niveau 3 — encore 4 articles`.
    - *Pourquoi* : anticipation = carotte ; l'utilisateur voit un futur désirable proche.
  - **Rang & XP** : `Initié → encore 120 XP pour Praticien` (barre de rang).
    - *Pourquoi* : progression identitaire, pas juste chiffrée.
- **Métacognition (2 cartes)** :
  - **Vos faiblesses** : « Vous confondez souvent *Abus de confiance / Vol / Escroquerie* → révision recommandée » `[Réviser]`.
    - *Pourquoi* : le plus fort levier d'apprentissage — on cible ce qui coince, avec une action directe.
  - **Vos points forts** : « Responsabilité civile · Contrats · Capacité ».
    - *Pourquoi* : renforcement positif ; l'utilisateur se sent compétent (confiance = rétention).
- **Révisions urgentes** : mini-timeline `Aujourd'hui · Demain · Cette semaine` (compteurs).
  - *Pourquoi* : crée l'urgence douce qui ramène chaque jour (boucle d'habitude SRS).
- **Derniers sceaux obtenus** : galerie horizontale de médaillons dorés.
  - *Pourquoi* : fierté + preuve de progrès ; l'or récompense visuellement l'effort.
- **Calendrier d'assiduité** (heatmap) discret en pied.
  - *Pourquoi* : la régularité se voit ; renforce la série.

### Interactions
- Survol de carte : léger *lift* + la carte révèle son CTA.
- Cocher une tâche de mission : coche animée + barre du jour qui avance + toast `+XP`.
- Clic sceau : ouvre une fiche (article, date d'obtention, score).

### Animations
- **Count-up** des chiffres à l'arrivée (progression, XP, série).
- **Anneau** de mission qui se remplit au chargement.
- **Pulsation** discrète sur l'action prioritaire (attire l'œil sans agiter).
- Cascade (stagger) d'apparition des cartes.

### Motivation mobilisée
Mission du jour (feuille de route), récompense anticipée (XP/sceau), série (habitude), rang (identité),
déblocage (anticipation), faiblesses/forces (métacognition). → **L'utilisateur peut rester plusieurs
minutes sans s'ennuyer** parce que chaque bloc raconte une facette de son ascension.

### État vide (Jour 1)
Un seul héros : « Votre parcours commence. Première notion offerte : *Abus de confiance*. » + `[Commencer]`.
Pas de dashboard vide et gris — une **invitation**.

---

## 2. Bibliothèque — « Le Codex »

**🎓 Objectif pédagogique** : donner une carte mentale du droit (domaine → notion → chapitre → article) et faire choisir la prochaine cible.
**❤️ Émotion visée** : curiosité + convoitise (« je veux ouvrir ce tome »).
**🎯 Action principale** : ouvrir un code / reprendre un article.

### Informations prioritaires
Progression par code · articles maîtrisés · derniers étudiés · niveau atteint · domaines disponibles ·
et par article : statut, % de maîtrise, difficulté, temps estimé, dernière révision, score, phases faites/restantes.

### Hiérarchie & navigation en profondeur (le drill-down est l'expérience)
1. **Étagère** : les codes comme des **tomes** verticaux, tranche gravée, couleur par matière, **jauge de progression sur la tranche**. Filtre par pays.
   - *Pourquoi* : un code = un ouvrage → on passe d'une « liste » à une **bibliothèque** qu'on a envie d'explorer.
2. **Tome ouvert** (au clic) : en-tête du code (progression, niveau, temps estimé restant) puis **Domaines**.
3. **Domaine → Chapitres → Notions → Articles** : descente progressive, fil d'ariane clair, transition d'ouverture à chaque niveau.
   - *Pourquoi* : structure le droit comme un savoir organisé (pas un vrac) ; chaque palier donne un sentiment de maîtrise du territoire.
4. **Carte Article** (unité de base) :
   - Titre + `Art. 613-1` (mono gravé).
   - **Statut** : ⬤ Maîtrisé (or) · ◐ En cours · 🔒 Verrouillé.
   - **Anneau de maîtrise** (%) + **pastille de difficulté** (simple→piège) + **temps estimé** + **dernière révision** + **score**.
   - **Mini-stepper** des 5 phases (faites / restantes).
   - *Pourquoi* : l'utilisateur décide en un coup d'œil « quoi étudier maintenant » selon son énergie (temps) et sa stratégie (difficulté/urgence).

### Interactions
- Ouverture de tome = transition « le livre s'ouvre » (spectaculaire, cf. anim).
- Survol article : la carte se soulève, l'anneau de maîtrise s'anime.
- Filtre/tri : par statut, difficulté, « à réviser », « jamais commencé ».
- Recherche ⌘K : « invoquer un article » par numéro ou notion.

### Animations
- **Ouverture du tome** (rotation/echelle, contenu qui se déplie).
- Tranches qui se **remplissent** selon la progression.
- Verrou qui « clique » sur un contenu verrouillé (feedback honnête, pas frustrant).

### Motivation
Convoitise (tomes verrouillés dorés), progression visible partout (jauges, anneaux), liberté de choix
stratégique (temps/difficulté). → donne **envie d'explorer**.

### État vide
Tome « À venir » verrouillé, élégant : « Le Code civil arrive bientôt. » (pas une case vide).

---

## 3. Parcours d'apprentissage — « La Mission » (5 phases)

**🎓 Objectif pédagogique** : faire vivre le cycle *reconnaître → comprendre → mémoriser → maîtriser* activement, jamais en lecture passive.
**❤️ Émotion visée** : immersion + sensation de **monter** d'un cran à chaque phase.
**🎯 Action principale** : compléter la phase courante pour débloquer la suivante.

### Cadre : le Mode Focus
Le parcours **masque la navigation** (sidebar/header). On **entre** dans une salle. Seule persiste la
**carte de mission** (stepper 5 phases coloré). *Pourquoi* : l'immersion supprime les distractions et
signale « ici, on travaille ».

### Identité par phase (couleur + icône + rituel d'entrée)
- **0 · Découverte** (ciel) — héros illustré, cartes *Pourquoi la notion existe / Ce qu'elle protège / Ce que vous saurez faire*. Émotion : éveil.
- **1 · Reconnaissance** (indigo) — **dossiers juridiques** (contexte, personnages, éléments, question). Émotion : enquête.
- **2 · Compréhension** (émeraude) — **blocs** de raisonnement (conditions, éléments, exceptions…). Émotion : le déclic.
- **3 · Mémorisation** (violet) — **surface Parchemin**, texte à trous, score, révélation du texte officiel. Émotion : ancrage.
- **4 · Maîtrise** (or) — **estampage du Sceau**, XP, montée éventuelle de rang. Émotion : accomplissement.

### La transition entre phases (le moment-clé)
Une **cérémonie ½ seconde** : la couleur de la phase suivante **balaie** l'écran, son nom s'affiche
en grand (serif), puis le contenu entre. *Pourquoi* : matérialise « je franchis un cap » — c'est ce qui
transforme un enchaînement d'écrans en **ascension ressentie**.

### Interactions & animations
- Réponses interactives (dossiers, blocs, trous) avec feedback immédiat (<100 ms).
- Progression en direct (mots complétés, score qui monte).
- **Estampage du sceau** en phase 4 (scale + rotation + éclat doré + confettis or).
- Verrou de la phase suivante qui s'ouvre.

### Motivation
Chaque phase = une petite victoire ; la barre de mission montre le chemin ; la phase 4 délivre la
récompense rare (sceau). → « je ne lis pas, j'**avance** ».

---

## 4. Révisions — « La séance du jour »

**🎓 Objectif pédagogique** : consolider la mémoire à long terme via répétition espacée, en priorisant l'oubli imminent.
**❤️ Émotion visée** : contrôle + soin (« je renforce mon savoir »).
**🎯 Action principale** : lancer la séance (un seul CTA).

### Le modèle mental : 5 états de mémoire
Chaque carte-article vit dans un **état** visible : **🔴 Urgent → 🟠 Fragile → 🟡 Correct → 🟢 Maîtrisé → 💠 Ancré**.
*Pourquoi* : rend l'invisible (l'état de mémoire) **visible et actionnable** ; l'utilisateur comprend *pourquoi* réviser tel article.

### Hiérarchie
- En-tête : « Le maître a préparé votre séance » + nombre de cartes + **durée estimée** + récompense.
- **Colonnes/piles par état** (Urgent en premier), compteurs par colonne.
- CTA unique **« Démarrer la séance »** (ambre = urgence douce, pas rouge anxiogène).

### L'interaction signature : la mémoire qui se renforce
Quand l'utilisateur répond **correctement**, la carte **migre visuellement** vers l'état supérieur
(Fragile → Correct → Maîtrisé → Ancré), avec animation de déplacement + halo qui se stabilise.
*Pourquoi* : feedback de progression **tangible** — on **voit** sa mémoire se solidifier, ce qui donne
envie de revenir demain (la boucle d'habitude est la clé de la rétention SRS).

### Animations
- Cartes qui glissent d'une pile à l'autre (transform/opacity).
- « Pouls » sur les cartes Urgent (attirent l'attention).
- En fin de séance : bilan (« +N cartes consolidées ») + XP.

### Motivation
Urgence maîtrisée, progression visible carte par carte, streak, récompense de séance. → **donne envie de revenir chaque jour**.

### État vide
« Tout est ancré aujourd'hui. Le maître vous laisse repos. Revenez demain. » (illustration sereine).

---

## 5. Examens — « L'Épreuve » (interface radicalement différente)

**🎓 Objectif pédagogique** : évaluer la capacité à mobiliser plusieurs notions sous contrainte (temps, mélange), comme en situation réelle.
**❤️ Émotion visée** : tension maîtrisée → fierté (« j'ai passé une vraie épreuve »).
**🎯 Action principale** : composer, puis découvrir son résultat.

### Rupture d'interface : tout disparaît
Au lancement, **la sidebar, le header, tout disparaît**. Fond **Encre** profond, silence visuel, mode
focus total. *Pourquoi* : la solennité **fait** l'examen ; l'absence de distraction crée l'enjeu.

### Trois temps
1. **Briefing** (avant) : matières couvertes · **difficulté** · **durée** · **enjeu/récompense** (un *Sceau d'Examen* doré). Bouton « Je suis prêt ».
   - *Pourquoi* : prépare mentalement, contractualise l'enjeu, dramatise l'entrée.
2. **Composition** (pendant) : **chronomètre** proéminent · barre de progression des questions · palette de navigation entre questions · **montée de tension visuelle** dans les dernières minutes (chrono qui vire à l'ambre puis rubis).
   - *Pourquoi* : le temps est un personnage de l'épreuve ; la tension est ce qui la rend mémorable.
3. **Feuille de résultats** (après) : **score** + temps · cachet **« ADMIS »** doré (ou « À REPRÉSENTER ») · **analyse question par question** · **points forts / points faibles** · **articles à revoir** (liens directs) · **recommandations & nouveaux objectifs** · récompense (sceau/badge).
   - *Pourquoi* : l'examen n'est pas une fin mais un **diagnostic** qui relance le cycle d'apprentissage (chaque faiblesse devient une action).

### Animations
- Ouverture cérémonielle (rideau / balance qui s'équilibre).
- Révélation du score (count-up dramatique).
- Estampage du cachet « ADMIS » doré + confettis (réussite uniquement).

### Motivation
Défi chronométré, récompense rare (sceau d'examen), diagnostic actionnable, sensation d'accomplissement. → **sensation de défi réel**.

---

## 6. Progression — « L'ascension »

**🎓 Objectif pédagogique** : donner du recul (chemin parcouru) et un cap (chemin restant), pour piloter son effort.
**❤️ Émotion visée** : recul serein + projection motivante.
**🎯 Action principale** : identifier le prochain palier et y retourner.

### Composants (chacun justifié)
- **Chronologie des sceaux** : frise des articles maîtrisés dans le temps. *Pourquoi* : rendre le progrès **narratif**.
- **Jauge par code** + **estimation de Maîtrise** (« terminé le … »). *Pourquoi* : cap tangible.
- **Heatmap d'assiduité** (calendrier). *Pourquoi* : la régularité se voit → renforce l'habitude.
- **Forces / faiblesses par phase** (radar : Découverte/Reconnaissance/Compréhension/Mémorisation). *Pourquoi* : montre *comment* on apprend, pas seulement combien.
- **Courbe d'XP / montée de rang**. *Pourquoi* : progression identitaire.

### Animations
Tracés qui se dessinent au chargement, radar qui se déploie, count-up.

---

## 7. Profil — « Le Dossier du Juriste »

**🎓 Objectif pédagogique** : ancrer l'identité d'apprenant (« je deviens juriste »), ce qui soutient la persévérance.
**❤️ Émotion visée** : **fierté**.
**🎯 Action principale** : contempler / partager sa progression, viser la prochaine distinction.

### Composants
- **En-tête d'identité** : avatar + **insigne de rang** + titre (« Initié ») + série record.
  - *Pourquoi* : statut immédiat, source de fierté.
- **Mur de sceaux** : collection dorée des articles maîtrisés (grille de médaillons).
  - *Pourquoi* : la collection donne envie de compléter (effet « collectionneur »).
- **Badges / distinctions** : obtenus + à obtenir (avec condition claire).
  - *Pourquoi* : objectifs à long terme, jalons de fierté.
- **Statistiques clés** : articles maîtrisés, temps d'étude, taux de réussite examens, série record.
- **Certifications** (examens réussis) : diplômes numériques scellés.
  - *Pourquoi* : preuve tangible de compétence — un « CV juridique vivant ».
- **Historique** : chronologie d'activité.

### Animations
Sceaux qui brillent au survol, insigne de rang qui s'anime, révélation des certifications.

### Motivation
Fierté, collection, distinctions à viser, identité de juriste en construction. → **donne de la fierté**.

---

## 8. Dashboard ADMIN — « Le Cockpit » (réservé au propriétaire)

**🎯 Objectif** : piloter la **rentabilité** et la **santé** du SaaS en temps réel. Réservé à ton compte
(rôle `admin`, `/admin` gated, RLS strict). Style **Stripe Dashboard / Vercel Analytics**, pas un panneau
CRUD. **❤️ Émotion (pour toi)** : contrôle et confiance.

> Détail complet des métriques dans [`DESIGN-VISION.md` §10](./DESIGN-VISION.md). Résumé expérientiel :

### Zones
1. **Barre KPI** (haut) : MRR/ARR · marge · utilisateurs actifs · **coût IA (Gemini)** · codes activés — chacun avec sparkline + variation %.
2. **Rentabilité** : courbe **Revenu vs Coûts** (Gemini + Supabase + Vercel) → **marge** dans le temps ; LTV/CAC ; alertes seuil.
3. **Coûts IA** (critique) : coût **par fonctionnalité** (situations/compréhension/mémo/examens), par job, par utilisateur ; **file des jobs IA** (réussis/échoués + relance) ; garde-fous budget.
4. **Utilisateurs** : DAU/WAU/MAU, **cohortes de rétention**, entonnoir d'activation, répartition pays/code.
5. **Apprentissage & contenu** : articles publiés/draft, **entonnoir du parcours** (% qui terminent chaque phase → points d'abandon), articles les plus difficiles, performances d'examens.
6. **Codes d'accès** : lots générés/activés/restants, attribution (école/promo), conversion par lot.
7. **Santé système** : erreurs, latence, quotas Supabase/Gemini/Vercel, uptime.

### Principes UI (data-first)
Résumé avant détail ; **état encodé dans la forme** (pastilles, stries de sévérité) ; couleur sémantique
(bon/alerte/critique) distincte de l'accent ; graphiques soignés (aire, grille faible, point final marqué) ;
filtres période partout ; export CSV ; alertes configurables. *Pourquoi* : un cockpit se **scanne et
s'opère**, il ne se lit pas ; ce qui demande attention doit sauter aux yeux.

---

## 9. Ce qui rend Jurist BF reconnaissable (récapitulatif)

En 5 secondes, l'utilisateur comprend « ceci forme des juristes » grâce à la **convergence** de :
- le **contraste Halls sombres ↔ Étude parchemin**,
- la **typo serif d'apparat**,
- les **motifs de droit** (sceau, balance, dossier, codex, cotes mono),
- l'**or rare** réservé à la maîtrise,
- la **progression ritualisée** (grades, sceaux, cérémonies),
- des écrans qui **poussent à l'action**, jamais des tableaux de chiffres inertes.

---

## 10. Prochaine étape (à ta validation)
1. Tu valides / ajustes cette conception d'expérience.
2. Je produis une **maquette visuelle du Dashboard** (Artifact) pour voir l'identité en vrai.
3. Après ton OK sur la maquette → implémentation dans l'ordre : tokens+fonts+Sceau → Shell → Dashboard → Parcours → Bibliothèque → Révisions → Examens → Progression/Profil → Admin.
