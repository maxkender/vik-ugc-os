-- Lancement du 16/11 au soir : 5 pays (FR, DE, IT, GB, ES). Le bouton « Activer ce lot » n'est cliqué que par Max.
update public.settings set value = value || '{"launch_batch": ["FR", "DE", "IT", "GB", "ES"]}'::jsonb where key = 'meta';
update public.settings set value = jsonb_set(value, '{checklist,translations}',
  (value->'checklist'->'translations') || '[{"country":"GB","lang":"en","reviewer":"Max","done":false}]'::jsonb)
where key = 'meta' and not (value->'checklist'->'translations') @> '[{"country":"GB"}]'::jsonb;
