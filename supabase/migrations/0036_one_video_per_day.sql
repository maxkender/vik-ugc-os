-- Décision de Max (16/11) : 1 vidéo par jour (et plus 2) partout.
update public.zones set videos_per_day = 1;
alter table public.zones alter column videos_per_day set default 1;
alter table public.posters alter column daily_quota set default 1;
update public.posters set daily_quota = 1 where daily_quota = 2;
update public.settings set value = value || '{"per_day": 1}'::jsonb where key = 'briefs';

-- Emails d'accès : « ton brief vidéo du jour ».
update public.email_templates set body = replace(body, 'every day you will find your 2 video briefs there', 'every day you will find your video brief of the day there') where key = 'access' and language = 'en';
update public.email_templates set body = replace(body, 'cada día encontrarás tus 2 briefs de vídeo', 'cada día encontrarás tu brief de video del día') where key = 'access' and language = 'es';
update public.email_templates set body = replace(body, 'chaque jour tu y trouveras tes 2 briefs vidéo', 'chaque jour tu y trouveras ton brief vidéo du jour') where key = 'access' and language = 'fr';

-- Contrat : nouvelle version (v2), la v1 reste pour les contrats déjà envoyés / signés.
insert into public.contract_templates (country_code, language, title, body_md, version, active)
select country_code, language, title,
  replace(replace(body_md,
    '(2 videos per day, posted consistently)', '(1 video per day, posted consistently)'),
    'Target: **{{videos_per_day}} videos per day**', 'Target: **{{videos_per_day}} video(s) per day** (1 video per day by default)'),
  version + 1, true
from public.contract_templates where active and version = 1 and language = 'en' and country_code is null
  and not exists (select 1 from public.contract_templates t2 where t2.version = 2 and t2.language = 'en' and t2.country_code is null);
update public.contract_templates set active = false where version = 1 and language = 'en' and country_code is null
  and exists (select 1 from public.contract_templates t2 where t2.version = 2 and t2.language = 'en' and t2.country_code is null);
