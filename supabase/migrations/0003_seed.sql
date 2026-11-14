-- Vik UGC OS — données de départ (idempotent).

alter table public.countries add column if not exists contract_clauses text;

insert into public.zones (code, name, price_per_video, rpm, rpm_views, currency, videos_per_day) values
  ('A', 'Zone A', 5.00, 1.00, 1000, 'USD', 2),
  ('B', 'Zone B', 3.50, 0.70, 1000, 'USD', 2),   -- [placeholder, à ajuster dans Réglages]
  ('C', 'Zone C', 2.50, 0.50, 1000, 'USD', 2)    -- [placeholder, à ajuster dans Réglages]
on conflict (code) do nothing;

-- Mêmes pays et zones que sophia-os (migration 0361 zones_paie_pays) ; langue de publication = LANGUE_PAR_PAYS.
insert into public.countries (code, name, zone_code, language) values
  ('FR','France','A','fr'),('NL','Netherlands','A','nl'),('DE','Germany','A','de'),('BE','Belgium','A','fr'),
  ('AT','Austria','A','de'),('IE','Ireland','A','en'),('GB','United Kingdom','A','en'),('DK','Denmark','A','da'),
  ('NO','Norway','A','no'),('SE','Sweden','A','sv'),('FI','Finland','A','fi'),('IS','Iceland','A','en'),
  ('LU','Luxembourg','A','fr'),('CH','Switzerland','A','de'),('US','United States','A','en'),('CA','Canada','A','en'),
  ('AU','Australia','A','en'),('NZ','New Zealand','A','en'),('JP','Japan','A','ja'),('SG','Singapore','A','en'),
  ('IL','Israel','A','he'),
  ('ES','Spain','B','es'),('IT','Italy','B','it'),('PT','Portugal','B','pt'),('GR','Greece','B','el'),
  ('PL','Poland','B','pl'),('CZ','Czechia','B','cs'),('SK','Slovakia','B','sk'),('HU','Hungary','B','hu'),
  ('SI','Slovenia','B','sl'),('HR','Croatia','B','hr'),('EE','Estonia','B','et'),('LV','Latvia','B','lv'),
  ('LT','Lithuania','B','lt'),('KR','South Korea','B','ko'),('AE','United Arab Emirates','B','ar'),
  ('CL','Chile','B','es'),('UY','Uruguay','B','es'),
  ('RO','Romania','C','ro'),('BG','Bulgaria','C','bg'),('RS','Serbia','C','sr'),('UA','Ukraine','C','uk'),
  ('GE','Georgia','C','en'),('AM','Armenia','C','en'),('TR','Turkey','C','tr'),('MX','Mexico','C','es'),
  ('CO','Colombia','C','es'),('BR','Brazil','C','pt'),('AR','Argentina','C','es'),('ZA','South Africa','C','en'),
  ('MA','Morocco','C','fr'),('MY','Malaysia','C','en'),('TH','Thailand','C','en'),('VN','Vietnam','C','en'),
  ('PH','Philippines','C','en'),('IN','India','C','en'),('ID','Indonesia','C','en'),
  ('PE','Peru','C','es'),('EC','Ecuador','C','es')
on conflict (code) do nothing;

-- Catégories de format (éditables dans Réglages → Catégories).
insert into public.categories (slug, name, keywords, color, sort) values
  ('reaction',   'Réaction',            array['reaction','react','reacting','réaction','reaccion','reacción','stitch','duet'], '#f97316', 1),
  ('broll',      'B-roll',              array['broll','b-roll','aesthetic','vlog','routine','day in my life','study vlog','studyvlog'], '#06b6d4', 2),
  ('facecam',    'Yapping / face cam',  array['storytime','yap','yapping','rant','pov tu','grwm','talking','facecam','face cam','story time'], '#8b5cf6', 3),
  ('tutorial',   'Tuto',                array['tutorial','tuto','how to','how-to','hack','tips','astuce','astuces','trucos','consejos','tipps','step by step'], '#22c55e', 4),
  ('before_after','Avant / après',      array['before','after','avant','après','antes','despues','después','glow up','glowup','transformation','grades went'], '#eab308', 5),
  ('pov',        'POV',                 array['pov','pov:'], '#ec4899', 6),
  ('slideshow',  'Slideshow',           array['slideshow','carousel','photo mode','slides','swipe'], '#64748b', 7),
  ('greenscreen','Green screen',        array['greenscreen','green screen','#greenscreen'], '#10b981', 8),
  ('skit',       'Sketch / skit',       array['skit','sketch','comedy','acting','when your','when you','me when'], '#ef4444', 9),
  ('listicle',   'Liste / top',         array['top 5','top 3','apps you need','apps that','best apps','must have','5 apps','3 apps'], '#3b82f6', 10)
on conflict (slug) do nothing;

insert into public.apps (slug, name, description, website, ios_url, android_url) values
  ('micabo', 'Micabo', 'Study with AI : transforme un cours (photo, PDF, vidéo) en résumé, flashcards et plan de révision.', null,
   'https://apps.apple.com/app/id6806651497', 'https://play.google.com/store/apps/details?id=com.micabo.app')
on conflict (slug) do nothing;

-- Concurrents (recherche du 14/11, cf. docs/concurrents.md). verified = handle vu sur la plateforme.
insert into public.competitors (app_id, name, website, notes, verified)
select a.id, v.name, v.website, v.notes, v.verified from public.apps a,
 (values
  ('Astra AI', 'https://astra-ai.co', 'Tuteur IA (Slovénie). Programme créateurs UGC très actif (ES, PT-BR).', true),
  ('Knowunity', 'https://knowunity.com', 'App d''entraide scolaire IA (Berlin). Comptes par pays : .fr .de .es .uk .pl .it', true),
  ('Gizmo', 'https://gizmo.ai', 'Flashcards IA, cible GCSE/A-level.', true),
  ('Flashka', 'https://flashka.ai', 'Flashcards IA (Estonie).', false),
  ('Diane', 'https://diane.app', 'Flashcards IA FSRS (France, médecine PASS/LAS).', false),
  ('Studyflash', 'https://studyflash.ai', 'Flashcards IA (Suisse). Programme UGC : comptes créateurs dédiés, pas de compte marque vérifié.', false),
  ('Quizlet', 'https://quizlet.com', 'Flashcards (leader historique).', false)
 ) as v(name, website, notes, verified)
where a.slug = 'micabo'
on conflict (app_id, name) do nothing;

-- Sources de collecte : toutes DÉSACTIVÉES par défaut (coûts Apify). Max les active dans Agents de collecte.
insert into public.sources (app_id, competitor_id, platform, kind, value, languages, max_results, frequency_hours)
select a.id, c.id, v.platform::public.platform, v.kind::public.source_kind, v.value, v.langs, 30, 24
from public.apps a
join (values
  ('Astra AI','tiktok','account','astra_ai_official', array['en']),
  ('Astra AI','tiktok','account','astra_ai_es', array['es']),
  ('Astra AI','tiktok','account','astra_ai_de', array['de']),
  ('Knowunity','tiktok','account','knowunity', array['en']),
  ('Knowunity','tiktok','account','knowunity.fr', array['fr']),
  ('Knowunity','tiktok','account','knowunity.de', array['de']),
  ('Knowunity','tiktok','account','knowunity.es', array['es']),
  ('Knowunity','tiktok','account','knowunity.uk', array['en']),
  ('Knowunity','tiktok','account','knowunity.pl', array['pl']),
  ('Knowunity','instagram','account','knowunity', array['en']),
  ('Knowunity','instagram','account','knowunity.fr', array['fr']),
  ('Knowunity','instagram','account','knowunity.de', array['de']),
  ('Gizmo','tiktok','account','gizmo.ai', array['en']),
  ('Gizmo','instagram','account','gizmo.ai', array['en']),
  ('Flashka','tiktok','account','flashka_ai', array['en']),
  ('Flashka','instagram','account','flashka_study', array['en']),
  ('Diane','tiktok','account','diane.app.officiel', array['fr']),
  ('Diane','instagram','account','fr.diane.app', array['fr']),
  ('Quizlet','tiktok','account','quizlet', array['en']),
  ('Astra AI','facebook_ads','page','Astra AI', array[]::text[]),
  ('Knowunity','facebook_ads','page','Knowunity', array[]::text[]),
  ('Gizmo','facebook_ads','page','Gizmo', array[]::text[]),
  ('Studyflash','facebook_ads','page','Studyflash', array[]::text[]),
  (null,'tiktok','hashtag','studytok', array['en']),
  (null,'tiktok','hashtag','studyhacks', array['en']),
  (null,'tiktok','hashtag','fichesderevision', array['fr']),
  (null,'tiktok','hashtag','tipsdeestudio', array['es']),
  (null,'tiktok','hashtag','lernen', array['de']),
  (null,'tiktok','keyword','ai study app', array['en']),
  (null,'tiktok','keyword','app pour réviser', array['fr']),
  (null,'tiktok','keyword','app para estudiar', array['es']),
  (null,'instagram','hashtag','studytok', array['en'])
) as v(comp, platform, kind, value, langs) on true
left join public.competitors c on c.app_id = a.id and c.name = v.comp
where a.slug = 'micabo'
on conflict (app_id, platform, kind, value) do nothing;

insert into public.pools (name, description) values ('Tous les posteurs actifs', 'Pool par défaut : répartition sur tous les posteurs actifs')
on conflict (name) do nothing;

insert into public.settings (key, value) values
  ('email', jsonb_build_object(
     'test_mode', true,                 -- garde-fou : tout est redirigé vers test_recipient
     'test_recipient', '',              -- vide = aucun email ne part (outbox seulement)
     'sender_name', 'Vik Studios',
     'sender_email', '',                -- expéditeur Brevo validé (à choisir dans Réglages → Emails)
     'reply_to', '',
     'rejection_delay_hours', 24,
     'send_rejection_emails', false)),
  ('payroll', jsonb_build_object('rpm_views', 1000, 'bonus_on', 'views_d7', 'week_starts', 'monday', 'min_views_for_bonus', 0)),
  ('apify', jsonb_build_object(
     'hard_cap_per_run', 200,           -- jamais plus de 200 résultats par run
     'default_max_results', 30,
     'monthly_budget_usd', 30,
     'collect_cron_enabled', false,     -- gros volumes désactivés par défaut
     'views_cron_enabled', true,
     'actors', jsonb_build_object(
        'tiktok', 'clockworks~tiktok-scraper',
        'instagram', 'apify~instagram-scraper',
        'facebook_ads', 'curious_coder~facebook-ads-library-scraper'))),
  ('meta', jsonb_build_object(
     'ad_account_id', 'act_1369526108446948',
     'page_id', '',
     'api_version', 'v21.0',
     'max_daily_budget', 50,            -- plafond affiché et imposé à l'activation
     'insights_cron_enabled', true)),
  ('landing', jsonb_build_object('base_url', '', 'default_country', 'US')),
  ('briefs', jsonb_build_object('per_day', 2, 'dispatch_cron_enabled', true)),
  ('creatives', jsonb_build_object('provider', 'elevenlabs', 'max_images_per_run', 4))
on conflict (key) do nothing;
