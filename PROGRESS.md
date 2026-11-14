# PROGRESS : état au matin du 15/11/2026

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
- ⚠️ Le code n'est **pas encore sur GitHub** : push refusé (403), l'app GitHub Claude n'a pas accès à `maxkender/vik-ugc-os`. Il y a 8 commits locaux, plus une copie dans `vik-ugc-os.bundle` (racine du dossier).

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

- **GitHub** : installer l'app Claude sur `maxkender/vik-ugc-os` (ou pousser depuis le bundle), puis brancher Vercel.
- **`APP_URL`** à poser dans les secrets Supabase une fois Vercel déployé : liens des emails et logo dans l'en-tête.
- **Pas vérifié dans un navigateur connecté** : écrans admin et espace posteur. Ils compilent et le build passe, mais la création d'un compte admin de test a été refusée par les permissions de la session. À cliquer avec ton compte.
- Non validés en réel :
  - `meta.create_ad` (upload d'image → adcreative → ad), qui a besoin du secret Meta et d'une créa ;
  - le fond IA ElevenLabs (plan Pro) ;
  - le relevé des vues sur de vrais posts.
- Modèles d'emails en EN et ES seulement (FR / DE / … retombent sur EN). À compléter dans Réglages → Emails.
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
