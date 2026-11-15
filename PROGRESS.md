# PROGRESS : état au 15/11/2026 (V3)

## V3 : ads, aperçus, assistant, créateurs, paie du lundi, design verre (15/11, soir)

Tout est en prod (https://vik-ugc-os.vercel.app, build vérifié identique au local) et testé connecté avec les comptes QA, sans erreur console ni API. Captures : `docs/screenshots/v3/` (par bloc) et `docs/screenshots/v3/prod/` (prod, 1440 et 390 px).

**Ce qui a été fait**
- **Meta → landing** : une campagne ne peut plus partir sans URL de landing (URL de la campagne, sinon `settings.landing.base_url`, sinon `APP_URL`, sinon erreur explicite).
- **Ads** : variantes regroupées (`ad_collation_id`), plateformes, vue cartes/tableau, 81 pubs concurrentes recollectées (~0,77 $ Apify).
- **Contenus & aperçus** : emails (versions), contrat, landing et espace créateur prévisualisables et modifiables depuis l'admin.
- **Assistant posteurs** : bulle de chat dans l'espace créateur (edge function `assistant`, claude-sonnet-5-5), journal côté admin.
- **Créateurs** : liste + fiche (posts, vues, paie, onboarding).
- **Paie du lundi** : ajustements, validation ligne par ligne ou globale, export CSV Ruul, email récap.
- **30 langues** : landing, candidature, signature et espace créateur (RTL pour ar/he).
- **Design verre** : sidebar et cartes translucides, couleurs par section, tableaux blancs denses.

**À savoir / reste à faire**
- `ANTHROPIC_API_KEY` n'est pas encore posé dans les secrets Supabase : l'assistant répond en mode dégradé, le vrai appel LLM n'a pas été testé.
- Traductions générées : relecture native conseillée (surtout langues genrées) ; formats de prix variables selon la langue.
- Ad Library : champ pays vide sur les pubs collectées.
- Email admin de test non renseigné : « M'envoyer un test » renvoie une erreur tant qu'il est vide (voulu, rien ne part).
- Conversations de démo de l'assistant (comptes QA) présentes dans le journal.
- Récap paie du lundi pas encore testé avec de vrais créateurs.


## V2.1 : refonte visuelle + tests connectés (15/11, après-midi)

**Design** (retour de Max : « genre blanc », « beau dashboard ») :
- thème tout blanc, bordures fines, accent bleu Vik utilisé avec parcimonie, teintes douces ;
- nouveau **tableau de bord `/admin`** : 6 KPI avec tendance, vidéos/jour par concurrent, funnel, top vidéos, « À traiter », classement ;
- toutes les pages refaites : Bibliothèque (filtres en puces, grille 9:16, tableau), Concurrents, Onboarding (stepper 12 étapes), Candidats, Briefs, Posteurs, Agents, Campagnes, Créas, Paie, Réglages ;
- espace créateur mobile (onglets en bas) ; landing, candidature et signature refaites.

Captures :
- avant : `docs/screenshots/before/`
- après, en local : `docs/screenshots/after/`
- après, **en prod** : `docs/screenshots/prod/`

**Comptes de test** (accord de Max) : `qa-admin`, `qa-controller`, `qa-poster`, `qa-candidate` @vik-qa.test. Ils sont marqués `is_test` et exclus de la paie, des emails (annulés, jamais envoyés) et des KPI. Suppression : SETUP.md §10.

**Parcours E2E connecté** (`scripts/e2e-journey.cjs`, vrai navigateur, Supabase de prod) :
1. Candidature : formulaire + upload vidéo.
2. Acceptation par l'admin dans Candidats (touche A).
3. Signature sur la page publique : PDF généré, compte posteur créé avec le rôle poster.
4. Espace posteur sur mobile : brief reçu par répartition, lien soumis, « Ton compte » (3 handles proposés), email Ruul.
5. Contrôleur : post validé ; Paie, Équipe et Candidats refusés.
6. Admin : paie calculée, le compte de test bien exclu.

Aucune erreur JavaScript ni API pendant le parcours.

**Bugs trouvés et corrigés pendant ces tests** :
1. Spend Meta du tableau de bord : comptait tout le compte pub Sophia. Il est maintenant limité aux campagnes UGC OS.
2. Les KPI et le funnel comptaient la candidature de démonstration. Comptes de test exclus partout.
3. **Attribution des pubs** : 123 pubs sans rapport (la recherche Ad Library par mot-clé est bruitée) étaient rattachées à des concurrents. Elles sont détachées, et une pub n'est désormais rattachée que si sa page correspond à la marque.
4. L'espace créateur s'affichait en anglais pour un candidat français. Il prend désormais la langue de la candidature, sauf si le créateur en choisit une autre.
5. Un compte créé à la signature avec une adresse de test n'était pas marqué `is_test`. Corrigé par un trigger.
6. Corrigés pendant la refonte : nombre de vidéos inexact dans Agents (1 186 au lieu de 1 525), menus déroulants tronqués, stepper qui ne prenait pas toute la largeur, textes qui débordaient dans Briefs.

**Reste à noter** :
- Les miniatures et vidéos TikTok sont bloquées dans mon environnement (zones grises sur certaines captures) ; elles s'affichent en prod chez Max.
- Les prix des créas s'affichent au format de chaque pays (« 5 $US » en France, « $5 » aux États-Unis).
- La paie de démonstration « Zoé Martin-E2E » reste visible tant que `scripts/cleanup-e2e.sql` n'est pas lancé.

---

## V2 : retours de Max (15/11)

**Données concurrents (priorité 1)**
- Backfill terminé : 56 runs, **4,96 $ réels** (5,28 $ depuis le début), **+1 267 vidéos**. Bibliothèque : **1 525 vidéos** (533 UGC, 165 pubs).
- Par concurrent (vidéos UGC / officielles / pubs) :
  - Knowunity : 92 / 32 / 15
  - Astra AI : 116 / 15 / 31
  - Gizmo : 79 / 19 / 30
  - Flashka : 74 / 2 / 30
  - Diane : 76 / 18 / 30
  - Studyflash : 88 UGC, 29 pubs
  - Quizlet : 8 UGC
- ≈ 740 vidéos génériques (« study app » dans ~30 langues) ne sont rattachées à aucun concurrent : utiles comme références de format.
- **174 créateurs UGC découverts**, ajoutés comme sources « compte » **désactivées** (Agents de collecte → filtrer, puis activer les meilleurs).
- Attribution automatique : officiel / UGC / pub. Nouvelles métriques : engagement, outlier (vues/abonnés), vélocité (vues/jour). Plafond Apify quotidien (30 $), budget backfill (50 $), coût par run et cumuls dans Agents.

**Écrans**
- **Bibliothèque** : 10 tris, filtres origine / créateur / concurrent, regroupement par concurrent, vue **Tableau** (colonnes triables, pagination, export CSV jusqu'à 5 000 lignes).
- **Concurrents** (nouvelle page) : classement, top vidéos, top créateurs UGC, formats qui marchent.
- **Design** : clair par défaut, sidebar par sections (Veille / Production / Recrutement / Finance / Réglages), fil d'Ariane, tableaux et écrans vides revus.

**Recrutement**
- **Rôles** : Contrôleur (valide les posts, corrige les vues, active ou archive les briefs ; pas de paie, réglages, équipe ni candidatures). **Équipe** : inviter par email, changer de rôle, retirer.
- **Onboarding** : 12 étapes horodatées par créateur, bloqués > 48 h en orange, « Relancer » par étape et en masse, historique des emails. Ouvertures et clics suivis par nos propres liens (testé en réel).
- **Contrat** : résumé simple dans la langue du créateur (EN / FR / ES / DE / IT / PT), puis le résumé en anglais, puis le contrat complet en anglais.
- **Handles** (page « Ton compte » du créateur) :
  - 3 handles proposés, disponibles sur TikTok ;
  - bio, nom affiché, lien en bio et conseils photo à copier ;
  - le créateur colle ses handles, puis vérification automatique de l'existence et de la bio (bouton + cron toutes les heures).
  - Aucun compte n'est créé pour lui (CGU).

**Créas et Meta**
- **Créas** : 30 langues, 2 à 3 accroches par langue, génération en lot (pays × formats), galerie filtrable, validation en masse.
- **Meta** :
  - campagnes par pays ou par zone, avec budget par groupe ;
  - éditeur de budget par ad set (clic admin), plafond par ad set + plafond global visible ;
  - « Pousser les créas » en masse ; CPL et coût par signé.
  - Tout est créé en PAUSED.
  - Campagne de test V2 : « [TEST Vik UGC OS] zone A » (52585023827809, PAUSED).

**Encore incomplet / à vérifier (V2)**
- **Pas testé connecté** : je ne peux pas ouvrir de session admin d'ici (création de compte de test refusée). Max doit cliquer :
  - Bibliothèque (tableau), Concurrents, Onboarding, Équipe, Ton compte, Créas, Campagnes ;
  - plus le parcours créateur complet sur une vraie candidature.
- **Traductions** des créas (30 langues) et des résumés de contrat : faites pendant le build, à faire relire par un natif avant de dépenser.
- **Instagram** : la disponibilité d'un handle n'est pas fiable depuis le serveur (réponse 404 même pour un compte existant). Les suggestions s'appuient sur TikTok ; la vérification d'un compte IG créé passe par Apify.
- **Webhook Brevo** : non enregistré (le suivi passe par nos liens) ; s'il faut l'ajouter, l'URL est `/functions/v1/track`.
- **Nouveaux concurrents** : pas de détection automatique ; à ajouter dans Réglages → Concurrents.
- **Backfill** : 4,96 $ dépensés sur les 50 $ autorisés. Pour aller plus loin : Agents de collecte → Backfill, ou activer les 174 sources découvertes.

---

# V1 : état au matin du 15/11/2026

## TL;DR

- Les 6 modules (A → F) sont construits. Backend déployé sur Supabase : 9 migrations, 9 edge functions, 10 crons.
- Front complet, compile sans erreur ; 35 tests Vitest au vert.
- La bibliothèque contient **151 vraies vidéos** : TikTok, Instagram, pubs Meta de Knowunity, Astra AI, Gizmo, Diane, #studytok… (≈ 0,40 $ d'Apify).
- Parcours complet testé de bout en bout sur la vraie base :
  - candidature (navigateur réel, upload vidéo) ;
  - acceptation, contrat, signature dans le navigateur, PDF ;
  - compte posteur, brief réparti, vidéo postée et validée ;
  - paie : 5 $ la première semaine + 48,25 $ de bonus J+7 la suivante ;
  - Ruul et « Payé sur Ruul ».
- **Aucun email réel n'est parti** : 6 emails sont dans la boîte d'envoi, bloqués par le garde-fou.
- **Secrets posés** (sauf `APP_URL`). Les fonctions déployées ont été retestées avec les vraies clés : collecte, archivage MP4, Meta, Brevo.
- **Logos Vik Studios intégrés** : palette officielle, sidebar, espace posteur, landing, login, favicon, en-tête des emails.
- **Pour démarrer : SETUP.md** (Vercel + `APP_URL`, première connexion = admin).
- ✅ Code poussé sur GitHub `maxkender/vik-ugc-os` (branche `main`, 15/11).

## Tester en 10 minutes (après SETUP.md §1–3)

1. **Bibliothèque** (`/admin/library`)
   - ~150 vidéos triées par score. Survoler une carte la lit.
   - Filtres : plateforme, langue, catégorie, « Pubs ». Recherche « studytok ».
   - Cliquer sur une vidéo → détail, catégorie, collections, « Archiver le MP4 » (Apify, ~0,01 $).
2. **Pubs gagnantes** : les pubs Knowunity qui tournent depuis 105 jours sont en tête. Bouton « Assigner en brief » (recyclage organique).
3. **Agents de collecte**
   - Activer une source, ou cliquer « Lancer » sur `@knowunity.es`.
   - Une minute plus tard, « Synchroniser les runs » : le run passe en *succeeded* et les nouvelles vidéos apparaissent.
   - Le coût du mois s'affiche en haut.
4. **Collecter à la demande** (bouton dans la Bibliothèque) : mot-clé « app para estudiar », 20 vidéos.
5. **Recrutement → Candidats** : la candidature de démo « Zoé Martin-E2E » est en « Actif ». Ouvrir `/join/es` puis `/apply/es` dans une fenêtre privée et postuler avec ton email, puis :
   - revenir en « Revue rapide » : vidéo yap intégrée, touches **A** (accepter), **R** (refuser), **S** (à revoir) ;
   - accepter → l'email « Please sign your contract » apparaît dans Réglages → Emails → Boîte d'envoi.
6. **Réglages → Emails**
   - Choisir l'expéditeur « Vik Studios » (vikstudios.com, vérifié dans Brevo), mettre ton email de test, laisser le mode test ON.
   - « Traiter la file maintenant » : tu reçois les emails `[TEST → …]`, dont le lien de signature.
   - Signer → PDF + email « Your access ».
7. **Posteurs / Briefs / Paie**
   - Briefs : la file « À valider ».
   - Paie : semaine du 09/11 → 48,25 $ (bonus) déjà marqué payé ; semaine du 02/11 → 5 $. Export CSV.
   - Posteurs : fiche Ruul.
8. **Campagnes Meta** : « Nouvelle campagne » (FR, ES, 5 €/jour) → campagne + ad sets créés **PAUSED** dans le Business Manager. « Créas » : générer FR / ES en 1:1 · 4:5 · 9:16, valider, puis « Ajouter une pub » sur un ad set (toujours PAUSED).
9. **Espace posteur** : se connecter avec un compte posteur (ou avec ton compte admin sur `/creator`) : briefs du jour, lien posté, vues, Ruul.

## Ce qui marche

### A. Bibliothèque de vidéos (priorité 1) ✅

**Collecte Apify** (`collect`)
- Par source (compte / hashtag / mot-clé / page FB), à la demande, ou planifiée (désactivée par défaut).
- Runs asynchrones + `poll` toutes les 5 min. Plafond de 200 vidéos/run, budget mensuel, `maxTotalChargeUsd`.

**Ingestion**
- Normalisation des 3 formats Apify, testée sur de vrais items (`src/test/fixtures`).
- Dédoublonnage `(platform, external_id)`, miniature dans Storage, langue (plateforme sinon heuristique).
- Catégorie auto, score, historique des vues (`video_metrics`).

**Explorateur**
- RPC `explore_videos` : pagination par curseur (keyset), index sur score / vues / dates / langue / pays, recherche plein texte (`tsvector` généré : auteur, hashtags, légende).
- Grille avec lecture au survol et scroll infini.
- Filtres : app, concurrent, plateforme, langue, pays, catégorie, période, vues min., score min., favoris, organique/pubs, collection.

**Autour de l'explorateur**
- Favoris (archive le MP4 automatiquement), collections, catégorie manuelle.
- « Assigner en brief » vers des posteurs choisis ou un pool, puis répartition sur la file du jour.
- Vue « Pubs gagnantes » (pubs qui tournent depuis ≥ X jours) → brief organique.
- Interface `Classifier` prête pour un classifieur IA.

### B. Recrutement ✅

- **Zones et pays** : zones A/B/C et 59 pays, éditables.
- **Landing** `/join/:country` : EN/ES/FR, tarifs de la zone, UTM transmis.
- **Formulaire** `/apply/:country` : majorité vérifiée côté client et serveur, upload résumable TUS (200 Mo max), anti-bot, email « Candidature reçue ».
- **Pipeline** : revue rapide au clavier, kanban, liste, filtres pays/zone. Les recruteurs ne voient que leurs pays (RLS).
- **Meta** : campagne + ad sets par pays, ads avec créa et landing UTM. Tout est PAUSED ; activation admin seulement, avec plafond ; métriques par pays et coût par candidature / par signé.
- **Créas** : fond IA ElevenLabs (plan Pro requis) ou dégradé, texte posé par template (canvas), formats 1:1 / 4:5 / 9:16, galerie, validation, envoi vers Meta.

### C. Contrat ✅

- Modèle par défaut + clauses par pays `[À VALIDER PAR MAX/JURIDIQUE]`, éditables, versionnés.
- Signature : nom tapé, case « J'accepte », SHA-256, IP, user-agent, horodatage ; PDF dans Storage.
- Relances J+1 / J+3 / J+6, expiration J+7.
- Compte posteur créé automatiquement, email « Your access ».

### D. Espace posteur ✅

- Briefs du jour avec vidéo de référence lisible, soumission du lien (RPC `submit_post`).
- Statuts, vues J+2 / J+7 (relevé Apify quotidien), graphique.
- Ruul : email, guide, « It's done ».
- Relevé hebdo ligne par ligne. EN / ES / FR.

### E. Paie ✅

- Calcul hebdo automatique (lundi), à la main pour n'importe quelle semaine.
- Export CSV, listes « À ajouter sur Ruul » et « Problèmes Ruul », « Payé sur Ruul » → email « You received X $ for the week of … ».

### F. Paid Ads (squelette) ✅

- Vidéos de nos posteurs qui percent, candidats, champ code Spark Ads, « Préparer en pub Meta » (statut seulement).

### Transverse

- Rôles admin / recruteur / posteur, RLS sur toutes les tables, advisors Supabase traités.
- Design sobre avec accent en variable CSS, clair / sombre.
- Admin en français, navigation latérale demandée.

## Validations d'intégration (vrais appels, 14/11)

| Intégration | Résultat |
|---|---|
| Supabase Management API | ✅ migrations, secrets, déploiement des functions, crons via pg_net (200) |
| Apify TikTok | ✅ 7 runs (comptes, hashtags, mots-clés), 112 vidéos, ≈ 0,03 $/run |
| Apify Instagram | ✅ 9 reels (@knowunity.de) |
| Apify Meta Ad Library | ✅ 30 pubs vidéo avec durée de diffusion (Knowunity : jusqu'à 105 jours) |
| Meta Marketing API | ✅ lecture du compte (EUR, VISA) et des pages ; **création PAUSED** campagne + ad set (EMPLOYMENT + DSA) |
| Brevo | ✅ lecture seule : compte (9 108 crédits), 4 expéditeurs vérifiés (dont Vik Studios @vikstudios.com). **Aucun envoi.** |
| ElevenLabs | ✅ API joignable ; `POST /v1/flows/image` → `paid_plan_required` (Pro). Fallback dégradé en place. |
| Edge functions avec vrais secrets (14/11, 23 h) | ✅ `collect.run_source` @knowunity.es → 10 vidéos + 10 miniatures dans Storage (0,024 $) ; `store_video` → MP4 archivé dans `reference-videos` ; `meta.status`, `meta.create_campaign` (PAUSED, FR, 1 €/j), `meta.sync_insights` (189 lignes) ; `emails.brevo_check` |
| E2E navigateur (Playwright) | ✅ landing FR/ES, candidature + upload TUS, signature (nom erroné refusé, nom correct accepté, PDF) |
| E2E serveur | ✅ acceptation → contrat → signature → posteur → brief pool → validation → paie (2 semaines) → Ruul → payé |

## Ce qui reste / limites connues

- **Vercel** : importer `maxkender/vik-ugc-os` (preset Vite), variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (SETUP.md §2).
- **`APP_URL`** à poser dans les secrets Supabase une fois Vercel déployé : liens des emails et logo dans l'en-tête.
- **Pas vérifié dans un navigateur connecté** : écrans admin et espace posteur. Ils compilent et le build passe, mais la création d'un compte admin de test a été refusée par les permissions de la session. À cliquer avec ton compte.
- Non validés en réel :
  - `meta.create_ad` (upload d'image → adcreative → ad), qui a besoin du secret Meta et d'une créa ;
  - le fond IA ElevenLabs (plan Pro) ;
  - le relevé des vues sur de vrais posts.
- Modèles d'emails en EN, ES et FR (les autres langues retombent sur EN). Modifiables dans Réglages → Emails.
- **Juridique** : contrat et clauses pays marqués `[À VALIDER PAR MAX/JURIDIQUE]` (droit applicable, statut indépendant par pays, exigences Ruul).
- **Meta** : avec la catégorie EMPLOYMENT, pas de ciblage 18–25 / étudiants (interdit par Meta). Voir DECISIONS.md §13.
- PDF de contrat : police Helvetica (caractères non latins remplacés par « ? »). Pour le japonais, l'hébreu, etc., embarquer une police Unicode.
- Le bundle JS principal fait 564 ko (167 ko gzip). Possible de le découper plus tard.

## Tests

`npm test` : 35 tests sur la logique métier (`supabase/functions/_shared/logic/logic.test.ts`).
- Paie : base, bonus J+7 décalé, arrondis, CSV.
- Zones et majorité ; répartition des briefs (quota, charge, pays / langue / pool).
- Relances signature / Ruul / mesures de vues ; score (percée, vélocité, longévité des pubs).
- Normalisation Apify sur de vrais items ; catégorisation ; garde-fou email ; plafonds Apify.
- Contrats (rendu, hash, signature) ; Meta (PAUSED, DSA, activation sous plafond, UTM).
