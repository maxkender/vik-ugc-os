# SETUP : ce que Max doit faire (≈ 15 min)

Projet Supabase : **vik-ugc-os** (`lnytuhsgzkqrkehemasu`, eu-west-1). Le schéma, les données de départ, les 9 edge functions et les 10 crons sont **déjà en place**.

## 1. Secrets Supabase

✅ **Posés le 14/11** : `APIFY_TOKEN`, `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID`, `BREVO_API_KEY`, `ELEVENLABS_API_KEY`, `CRON_SECRET`. **Reste à poser : `APP_URL`** (URL Vercel, une fois déployé), qui sert aux liens des emails et au logo de l'en-tête des emails.

Supabase → Edge Functions → **Secrets** : https://supabase.com/dashboard/project/lnytuhsgzkqrkehemasu/functions/secrets

| Nom exact | Valeur | Sert à |
|---|---|---|
| `APIFY_TOKEN` | token API Apify (Settings → Integrations) | agents de collecte, relevé des vues, archivage MP4 |
| `META_ACCESS_TOKEN` | token système « sophia-hub » (Business Manager) | campagnes de recrutement (PAUSED), métriques |
| `BREVO_API_KEY` | clé API Brevo (v3) | envoi des emails (garde-fou mode test) |
| `ELEVENLABS_API_KEY` | clé API ElevenLabs | fonds IA des créas (**plan Pro requis**, sinon fond dégradé) |
| `APP_URL` | URL du front Vercel, ex. `https://vik-ugc-os.vercel.app` (non secret) | liens dans les emails (signature, accès, paiements) |

Déjà posés : `CRON_SECRET` (généré pendant le build, aussi dans Vault) et les variables Supabase (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`…).

## 2. Déployer le front sur Vercel

1. Le code est sur GitHub : `maxkender/vik-ugc-os`, branche `main`.
2. Vercel → Add New → Project → importer `maxkender/vik-ugc-os`. Application Preset **Vite**, Build Command `npm run build`, Output Directory `dist`, Install Command par défaut (`npm install`). Tout est déjà dans `vercel.json`, y compris les réécritures SPA.
3. Variables d'environnement Vercel (publiques) :
   - `VITE_SUPABASE_URL` = `https://lnytuhsgzkqrkehemasu.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = clé **anon public**. Supabase → Project Settings → **API Keys** → onglet « Legacy API keys » → `anon` `public` (commence par `eyJ…`). C'est une clé publique : la sécurité vient de la RLS.
4. Deploy, puis reporter l'URL dans le secret `APP_URL` (étape 1) et dans Réglages → Intégrations → Landing.
5. Supabase → Authentication → URL Configuration : **Site URL** = l'URL Vercel ; **Redirect URLs** = `https://<url-vercel>/**` (+ `http://localhost:5173/**` pour le dev).

## 3. Devenir admin

- **Le premier compte qui s'inscrit lui-même devient admin.** Va sur `https://<url>/login`, entre ton email, clique sur le lien magique reçu (email envoyé par Supabase Auth, pas par Brevo).
- Si quelqu'un d'autre est passé avant : SQL Editor → `select public.promote_admin('ton@email.com');`
- Ensuite, pour éviter des inscriptions sauvages, tu peux désactiver « Allow new users to sign up » (Authentication → Providers → Email). Les posteurs sont créés par la signature du contrat, et les recruteurs se connectent une fois puis tu changes leur rôle dans Réglages → Équipe.
- Optionnel : brancher le SMTP Brevo dans Supabase Auth (Authentication → SMTP) pour les liens de connexion.

## 4. Emails (Brevo)

Réglages → Emails :
1. **Expéditeur** : clique sur un expéditeur vérifié dans la carte Brevo (aucun n'est choisi par défaut, donc rien ne part).
2. **Email admin de test** : ton email. Tant que le **mode test** est actif (par défaut), tous les emails partent vers cette adresse avec `[TEST → destinataire]` dans l'objet.
3. Quand tout est validé : désactive le mode test. Les vrais destinataires reçoivent alors les emails.

## 5. Collecte (Apify)

- Les 32 sources sont **désactivées**. Active celles que tu veux suivre dans **Agents de collecte**, ou lance-les à la main (« Lancer »).
- Collecte planifiée : Réglages → Intégrations → Apify → `collect_cron_enabled`. Plafond : 200 vidéos/run, budget 30 $/mois (modifiables).
- Le relevé des vues J+2/J+7 est actif (quelques centimes par jour).

## 6. Meta

- Compte pub : `act_1369526108446948` (EUR). Plafonds : **50 €/jour par ad set**, **100 €/jour au total**.
- **Page : « Vik Studios » (1509793888874260)**, seule page promouvable du compte (assignée au system user le 16/11).
- **Pixel dédié : « Vik UGC Recrutement » (2100580263915803)**. Chargé sur /join et /apply après consentement (PageView, ViewContent, Lead). Lead aussi envoyé côté serveur (Conversions API, même event_id), avec email, téléphone et pays hachés.
- **Objectif** des nouvelles campagnes : Prospects (OUTCOME_LEADS, conversion Lead du pixel). Trafic en option.
- **Ciblage EMPLOYMENT** : pays + langue + Advantage+ audience, 18–65. Ni genre, ni intérêts, ni code postal (contrôle automatique avant envoi).
- **Checklist de lancement** (Recrutement → Campagnes Meta) : « Activer » est bloqué tant qu'un prérequis critique est ❌, sauf forçage admin (journalisé).
- **À faire par Max : passer l'app Meta « Sophia Hub » (1076897012058637) en mode Live** (developers.facebook.com → App → Mode : Live ; URL de politique de confidentialité requise). Sinon Meta refuse de créer les publicités : « contenu créé par une application en cours de développement ».
- **Rien n'est jamais activé automatiquement.** Activation manuelle uniquement.
- Campagnes de test PAUSED du build : « [TEST Vik UGC OS] … » (52584959435009, 52584960892209). Elles peuvent être supprimées.
- **Pilote** (16/11) : « [Pilote] Recrutement créateurs UGC – Mexique + Colombie » (52585282269809), PAUSED, 2 ad sets à 15 €/jour, 12 créas validées. Les publicités seront créées dès que l'app sera en Live (bouton « Créer les pubs » de la campagne).

## 7. Crons (déjà actifs, UTC)

| Job | Quand | Quoi |
|---|---|---|
| `vik_collect_poll` | toutes les 5 min | ingère les runs Apify terminés |
| `vik_collect_due` | chaque heure (:17) | sources actives à échéance, **seulement si** `collect_cron_enabled` |
| `vik_measure_views` | 06:40 | relevé des vues J+2 / J+7 |
| `vik_rescore` | 03:10 | recalcul des scores |
| `vik_emails` | toutes les 5 min | envoi de la file (garde-fou) |
| `vik_recruit` | chaque heure (:25) | relances signature J+1/J+3/J+6, expiration J+7, refus différés |
| `vik_briefs_dispatch` | 05:00 | répartition des briefs « pool » |
| `vik_payroll` | lundi 07:00 | calcul de la paie de la semaine terminée |
| `vik_ruul` | 09:30 | relances Ruul |
| `vik_meta_insights` | toutes les 6 h | métriques Meta |

Voir ou modifier : SQL Editor → `select * from cron.job;`. Historique : `select * from net._http_response order by id desc limit 20;`.

## 8. Développement local

```bash
npm install
cp .env.example .env.local      # renseigner VITE_SUPABASE_ANON_KEY
npm run dev                      # http://localhost:5173
npm test                         # logique métier (Vitest)
```

Migrations : `supabase/migrations/*.sql`, appliquées dans l'ordre via `scripts/sql.sh <fichier>` (API Management, `SUPABASE_ACCESS_TOKEN`) ou le SQL Editor.
Edge functions : `npx supabase functions deploy <nom> --remote=lnytuhsgzkqrkehemasu --use-api` (token `SUPABASE_ACCESS_TOKEN`).

## 9. Nettoyage des données de test

Le build a laissé une candidature de démonstration complète (« Zoé Martin-E2E », jusqu'à la paie) et ~150 vidéos réelles. Pour supprimer la démo : `scripts/cleanup-e2e.sql` (SQL Editor).

## 10. Comptes de test (QA)

Créés le 15/11 avec l'accord de Max, pour tester l'app connecté (Playwright) :

| Email | Rôle |
|---|---|
| `qa-admin@vik-qa.test` | admin |
| `qa-controller@vik-qa.test` | contrôleur |
| `qa-poster@vik-qa.test` | posteur (FR, zone A) |

- Domaine non routable (`.test`) : aucun email ne peut leur parvenir. Les mots de passe sont aléatoires et ne sont gardés que dans l'environnement de la session de build : ils ne sont ni dans le repo, ni dans les logs.
- Marqués `profiles.is_test = true` et exclus :
  - de la **paie** (calcul hebdo) ;
  - des **emails** (`@vik-qa.test` → statut `cancelled`, raison `test_account`, jamais envoyé) ;
  - des **statistiques** du tableau de bord.
- Pour les tester toi-même : Réglages → Équipe → changer le mot de passe n'est pas prévu. Le plus simple est de te connecter avec ton propre compte, en changeant ton rôle.
- **Suppression** (SQL Editor) :
  ```sql
  delete from auth.users where email like '%@vik-qa.test';   -- cascade : profiles, posters, assignations
  ```
- Script de captures (connecté) : `QA_EMAIL=… QA_PASSWORD=… node scripts/screenshots.cjs <url> <dossier> [pages…]`.
