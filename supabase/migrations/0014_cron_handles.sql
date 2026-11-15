-- Vérification automatique des handles soumis par les créateurs (toutes les heures).
select cron.schedule('vik_handles_verify', '35 * * * *', $$select public.call_function('handles', '{"action":"verify_pending"}')$$);
