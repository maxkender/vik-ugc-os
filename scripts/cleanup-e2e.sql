-- Supprime les données de test créées pendant le build (candidature E2E « Zoé Martin-E2E »).
-- À lancer dans Supabase → SQL Editor quand tu n'en as plus besoin. Les vidéos de la bibliothèque sont gardées.
delete from public.email_outbox where to_email like 'e2e-%@example.com';
delete from public.payouts where poster_id in (select id from public.profiles where email = 'e2e-candidate@example.com');
delete from public.briefs where title like '[E2E]%';
delete from public.applications where email = 'e2e-candidate@example.com';
delete from auth.users where email = 'e2e-candidate@example.com';   -- cascade : profile, poster
-- Fichiers : Storage → yap-videos/pending et contracts/<application_id> (à supprimer à la main si besoin).
