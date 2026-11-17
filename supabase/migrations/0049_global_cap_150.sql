-- Décision de Max (17/11) : plafond global 150 €/jour, compté sur les ad sets ACTIFS uniquement.
update public.settings set value = value || '{"global_daily_cap": 150}'::jsonb where key = 'meta';
