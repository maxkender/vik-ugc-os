-- Grille tarifaire et liste de pays du 16/11 (décision de Max). Remplace l'ancienne liste issue de sophia-os.
alter table public.zones add column if not exists bonus_cap numeric(10,2);
update public.zones set price_per_video = 10, rpm = 1.00, rpm_views = 1000, bonus_cap = 300 where code = 'A';
update public.zones set price_per_video = 6,  rpm = 0.50, rpm_views = 1000, bonus_cap = 150 where code = 'B';
update public.zones set price_per_video = 3,  rpm = 0.20, rpm_views = 1000, bonus_cap = 60  where code = 'C';

-- 62 pays ouverts (zone + langue principale de la landing).
with v(code, name, zone, lang) as (values
  -- Zone A (21)
  ('DE','Germany','A','de'), ('AU','Australia','A','en'), ('AT','Austria','A','de'), ('BE','Belgium','A','fr'),
  ('CA','Canada','A','en'), ('DK','Denmark','A','da'), ('US','United States','A','en'), ('FI','Finland','A','fi'),
  ('FR','France','A','fr'), ('IE','Ireland','A','en'), ('IS','Iceland','A','is'), ('IL','Israel','A','he'),
  ('JP','Japan','A','ja'), ('LU','Luxembourg','A','fr'), ('NO','Norway','A','no'), ('NZ','New Zealand','A','en'),
  ('NL','Netherlands','A','nl'), ('GB','United Kingdom','A','en'), ('SG','Singapore','A','en'), ('SE','Sweden','A','sv'),
  ('CH','Switzerland','A','de'),
  -- Zone B (17)
  ('SA','Saudi Arabia','B','ar'), ('CL','Chile','B','es'), ('KR','South Korea','B','ko'), ('HR','Croatia','B','hr'),
  ('AE','United Arab Emirates','B','ar'), ('ES','Spain','B','es'), ('EE','Estonia','B','et'), ('GR','Greece','B','el'),
  ('HU','Hungary','B','hu'), ('IT','Italy','B','it'), ('LV','Latvia','B','lv'), ('LT','Lithuania','B','lt'),
  ('PL','Poland','B','pl'), ('SK','Slovakia','B','sk'), ('SI','Slovenia','B','sl'), ('CZ','Czechia','B','cs'),
  ('UY','Uruguay','B','es'),
  -- Zone C (24)
  ('ZA','South Africa','C','en'), ('AR','Argentina','C','es'), ('AM','Armenia','C','hy'), ('BO','Bolivia','C','es'),
  ('BR','Brazil','C','pt'), ('BG','Bulgaria','C','bg'), ('CO','Colombia','C','es'), ('EC','Ecuador','C','es'),
  ('GE','Georgia','C','ka'), ('IN','India','C','hi'), ('ID','Indonesia','C','id'), ('KZ','Kazakhstan','C','kk'),
  ('LB','Lebanon','C','ar'), ('MY','Malaysia','C','ms'), ('MA','Morocco','C','fr'), ('MX','Mexico','C','es'),
  ('PH','Philippines','C','en'), ('RO','Romania','C','ro'), ('RS','Serbia','C','sr'), ('TH','Thailand','C','th'),
  ('TR','Turkey','C','tr'), ('UA','Ukraine','C','uk'), ('VE','Venezuela','C','es'), ('VN','Vietnam','C','vi')
)
insert into public.countries (code, name, zone_code, language, open)
select code, name, zone, lang, true from v
on conflict (code) do update set zone_code = excluded.zone_code, language = excluded.language, open = true;

-- Tout pays hors liste est fermé (plus de landing ni de pub) ; Portugal fermé depuis le 02/11, gardé en base.
update public.countries set open = false where code not in (
  'DE','AU','AT','BE','CA','DK','US','FI','FR','IE','IS','IL','JP','LU','NO','NZ','NL','GB','SG','SE','CH',
  'SA','CL','KR','HR','AE','ES','EE','GR','HU','IT','LV','LT','PL','SK','SI','CZ','UY',
  'ZA','AR','AM','BO','BR','BG','CO','EC','GE','IN','ID','KZ','LB','MY','MA','MX','PH','RO','RS','TH','TR','UA','VE','VN');

-- Contrat : le bonus aux vues est plafonné par vidéo.
update public.contract_templates set body_md = replace(body_md, 'measured 7 days after publication (D+7).', 'measured 7 days after publication (D+7), capped at {{bonus_cap}} per video.')
where body_md like '%measured 7 days after publication (D+7).%';
