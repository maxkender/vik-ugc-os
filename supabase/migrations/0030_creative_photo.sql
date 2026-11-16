-- Créas v2 : photo réaliste (fal), estimation mensuelle prudente et mention légale.
alter table public.recruitment_creatives add column if not exists monthly_line text;
alter table public.recruitment_creatives add column if not exists disclaimer text;
alter table public.recruitment_creatives add column if not exists hook text;
update public.settings set value = value || '{"provider": "fal", "fal_model": "fal-ai/flux/dev"}'::jsonb where key = 'creatives';
insert into public.settings (key, value) select 'creatives', '{"provider": "fal", "fal_model": "fal-ai/flux/dev"}'::jsonb
where not exists (select 1 from public.settings where key = 'creatives');
