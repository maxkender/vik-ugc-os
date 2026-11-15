# Décisions prises pendant le build (nuit du 14 au 15/11/2026)

Chaque choix ci-dessous a été pris seul, pour ne pas bloquer. Tout est modifiable.

## Produit et métier

1. **« Mikabo » s'écrit Micabo.** L'app est `micabo` dans la base (App Store id6806651497, Play `com.micabo.app`, éditeur Vik Studios SAS). Les concurrents sont vérifiés dans `docs/concurrents.md`. « Diane AI » est **Diane** (diane.app). « Flashka » est bien Flashka (flashka.ai).
2. **RPM = bonus pour 1 000 vues, pas pour 1 vue.** « 1 $ par vue » ferait 10 000 $ pour 10 000 vues : ce n'est sûrement pas l'intention. Le paramètre est `zones.rpm_views` (1 000 par défaut), éditable par zone dans Réglages → Pays & zones.
3. **Zones A/B/C** : mêmes pays et mêmes zones que sophia-os (`zones_paie_pays`, 59 pays). Par défaut : A = 5 $/vidéo + 1 $/1 000 vues ; B = 3,50 $ + 0,70 $ ; C = 2,50 $ + 0,50 $. **Les valeurs de B et C sont des placeholders.** La langue de publication de chaque pays reprend `LANGUE_PAR_PAYS` de sophia-os.
4. **Paie hebdo (lundi → dimanche, UTC).**
   - **Base** : vidéos **validées** publiées dans la semaine × tarif de zone.
   - **Bonus** : vues J+7 × RPM, payé **la semaine où tombe le J+7**. Une vidéo publiée dimanche voit donc son bonus payé la semaine suivante.
   - Rien n'est payé deux fois, et une semaine marquée « payée » n'est jamais recalculée.
   - Une vidéo « postée » mais pas encore validée n'est pas payée.
5. **Relances.** Signature : J+1, J+3, J+6, puis expiration à J+7. Ruul : invitation, puis J+1, puis J+3 ; à J+5 sans « It's done », le posteur passe dans « Problèmes Ruul ». Mêmes règles que sophia-os.
6. **Répartition des briefs.** Quota de 2 par posteur et par jour (réglable par posteur). On sert le brief le plus ancien d'abord, et on choisit le posteur le moins chargé, compatible pays et langue (`es-419` est compatible `es`). Un posteur ne reçoit jamais deux fois le même brief.
7. **Score (0–100).**
   - **Organique** : percée (vues ÷ abonnés, 40 pts) + vélocité (vues/jour amorties, 40 pts) + engagement (20 pts). Un petit compte qui fait des millions de vues passe devant un gros compte moyen.
   - **Pubs** : longévité. 7 j = 25, 21 j = 50, ~105 j = 100, +10 si la pub tourne encore.
   - Recalcul chaque nuit, car la vélocité baisse avec l'âge.
8. **Catégories.** Heuristique sur la légende, les hashtags et l'effet TikTok (ex. l'effet « Green Screen » ajoute le tag `greenscreen`). L'interface `Classifier` (`_shared/logic/categorize.ts`) est prête pour un classifieur IA. Une catégorie corrigée à la main n'est plus jamais écrasée par l'auto.
9. **MP4.** On ne télécharge le MP4 que pour les **favoris** et les **vidéos assignées en brief**, plus le bouton « Archiver le MP4 ». Pour le reste : miniature dans Storage (bucket `thumbnails`) et lecture depuis l'URL du CDN tant qu'elle est valide.
10. **Statut « Actif »** d'une candidature : passe automatiquement de « Signé » à « Actif » au premier lien de vidéo posté (trigger SQL).

## Technique

11. **Apify** (coûts observés le 14/11, plafonnés partout).
    - Acteurs : `clockworks~tiktok-scraper` (≈ 0,0037 $/vidéo), `apify~instagram-scraper` (≈ 0,0027 $), `apify~facebook-ads-scraper` pour la Meta Ad Library (≈ 0,0058 $/pub).
    - Plafonds : 200 vidéos max par run, budget mensuel de 30 $, `maxTotalChargeUsd` sur chaque run (minimum imposé par Apify : 0,50 $).
    - L'API officielle `/ads_archive` renvoie « permission ». L'adaptateur est le réglage `apify.actors.facebook_ads` plus `normalizeFacebookAd`. Pour basculer sur l'API officielle, il suffit d'ajouter un `normalize` pour son format.
12. **Collecte planifiée désactivée par défaut** (`apify.collect_cron_enabled = false`), et les 32 sources sont désactivées. Les runs sont **asynchrones** : on démarre le run, puis `collect.poll` (toutes les 5 min) ingère le dataset. Ça évite la limite de durée des edge functions.
13. **Meta.**
    - Objectif `OUTCOME_TRAFFIC` (vers la landing).
    - Catégorie spéciale **EMPLOYMENT** obligatoire pour une offre de travail. Conséquence : Meta **interdit** le ciblage 18–25 ans et les intérêts « étudiants ». On envoie pays + 18–65, et l'intention 18–25/étudiants est notée dans `meta_adsets.targeting.intent`. Le ciblage se fait donc par la créa et la landing. **[À VALIDER PAR MAX]** : si Max préfère ne pas déclarer EMPLOYMENT, c'est un risque de refus ou de restriction du compte.
    - UE : `dsa_beneficiary` et `dsa_payor` = « Vik Studios » (obligatoires, découvert pendant la validation).
    - Page utilisée : « Sophia » (1209366402267598), la seule page accessible par le token. À changer dans Réglages → Intégrations si une page Vik Studios existe.
    - Garde-fous : `assertPaused` dans la logique, plus `createPaused` dans la fonction. Aucun cron n'active jamais rien. « Activer » exige un humain admin et un budget ≤ plafond (50 €/jour par défaut).
14. **Créas : ElevenLabs a bien une API image** (`POST /v1/flows/image`, modèles Gemini 3.1 Flash Image, GPT-Image, Seedream…). Mais **le compte renvoie `paid_plan_required`** (plan Pro requis). Le code est branché (fonction `creatives`, polling, stockage). Tant que le plan n'est pas Pro, l'admin utilise un fond dégradé à la couleur d'accent. Aucun nouvel hôte n'est nécessaire.
15. **Texte des créas rendu par template dans le navigateur (canvas + Inter), pas côté serveur (satori/resvg).** C'est plus fiable dans le runtime des edge functions, le rendu est identique et le texte toujours juste dans chaque langue. Le PNG est stocké dans `creatives/rendered/`.
16. **Signature électronique maison.**
    - Le texte exact est rendu à l'envoi, puis on calcule son empreinte SHA-256.
    - À la signature : nom tapé (comparé au nom de la candidature, sans accents ni casse), case cochée, empreinte vérifiée, puis enregistrement de l'IP, du user-agent et de l'horodatage.
    - PDF généré avec pdf-lib (police Helvetica : les caractères non latins sont remplacés par « ? » dans le PDF ; le texte exact reste en base).
17. **Accès posteur.** L'email « Your access » pointe vers `/login?email=…` (lien magique à la demande), et non vers un lien magique pré-généré : ceux-ci expirent en 1 h, alors que l'email peut rester en file.
18. **Rôles.**
    - Le premier compte qui **s'inscrit lui-même** devient admin. Un compte créé par la signature d'un contrat est **toujours** posteur : correctif issu du test E2E, car un créateur signant avant la première connexion de Max devenait admin.
    - Un recruteur voit et décide uniquement les candidatures de ses pays (RLS `can_see_country`).
19. **Emails.**
    - Tout passe par `email_outbox`.
    - Mode test **activé** par défaut ; sans email de test → statut `held`, rien ne part.
    - Sans expéditeur Brevo → `held` aussi.
    - Les emails `held` repartent automatiquement quand les réglages le permettent.
    - Les modèles existent en EN, ES et FR ; les autres langues retombent sur EN.
20. **Crons via pg_cron + pg_net.** Ils appellent les edge functions avec l'en-tête `x-cron-secret`. Le secret (`CRON_SECRET`) a été généré pendant le build et posé à la fois dans les secrets des functions et dans Vault. Personne n'a besoin de le connaître.
21. **i18n.** Admin en français. Landing, candidature, signature et espace posteur en EN / ES / FR (langue déduite du pays, `?lang=` prioritaire).
22. **Kit UI.** Composants style shadcn écrits à la main (Tailwind v4 + variables CSS, sans Radix) : moins de dépendances, et le thème se change avec `--accent` dans `src/index.css`.
23. **Identité visuelle (logos reçus le 14/11).** Palette officielle en variables CSS (`--vik-navy/blue/cyan/violet/yellow/red`) et en tokens Tailwind (`bg-vik-blue`…). Accent = bleu `#004DFF` en clair, cyan `#1FAFFF` en sombre (lisible sur fond navy). Logos dans `public/brand/`. **Recadrage `viewBox="426 478 1024 152"`, pas `680 …`** : le mot « vik » est à x = 432–663, donc le cadre proposé l'aurait coupé (vérifié en rendant le SVG). PNG du logo pour l'en-tête des emails, car Gmail n'affiche pas le SVG. Il n'est utilisé que si `APP_URL` est une URL https.
24. **MP4 archivés par Apify** : l'acteur TikTok les dépose dans un key-value store privé. Le téléchargement envoie donc le token Apify pour les URL `api.apify.com` (corrigé après le test réel).
