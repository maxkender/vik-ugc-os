# Vik UGC OS

Outil interne de Vik Studios. Il recrute, contracte, briefe, suit et paie les créateurs UGC qui postent des vidéos pour nos apps. Première app : **Micabo**.

- **Bibliothèque de référence** : collecte Apify (TikTok, Instagram, Meta Ad Library), score de performance, explorateur rapide, catégories, favoris, collections, « Assigner en brief ».
- **Recrutement** : landing multilingue par pays, formulaire avec vidéo « yap », pipeline kanban, campagnes Meta (toujours PAUSED), créas statiques.
- **Contrat** : signature électronique intégrée (horodatage, IP, empreinte SHA-256, PDF), création automatique du compte posteur.
- **Espace posteur** : 2 briefs par jour, soumission des liens, vues J+2/J+7, paiements Ruul.
- **Paie** : calcul hebdo (vidéos × tarif de zone + bonus RPM sur les vues J+7), CSV, « Payé sur Ruul ».

Stack : Vite + React + TypeScript + Tailwind v4, Supabase (Postgres + RLS, Auth, Storage, Edge Functions Deno, pg_cron), Vitest.

```
src/                         front (admin en français, espace posteur + landing en EN/ES/FR)
supabase/migrations/         schéma, RLS, seed, crons
supabase/functions/          edge functions (collect, emails, apply, recruit, contract, payroll, briefs, meta, creatives)
supabase/functions/_shared/logic/   logique métier pure, partagée front/back et testée (npm test)
scripts/                     sql.sh (API Management), validate-collect.ts, cleanup-e2e.sql
```

À lire : **[PROGRESS.md](PROGRESS.md)** (état et test en 10 min), **[SETUP.md](SETUP.md)** (secrets, Vercel, admin), **[DECISIONS.md](DECISIONS.md)**.

## Déploiement Vercel

`vercel.json` est prêt (Vite, réécritures SPA). Variables : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Détails dans SETUP.md § 2.
