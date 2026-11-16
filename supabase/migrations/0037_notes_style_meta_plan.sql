-- Style de créa « Notes iPhone » (16/11).
alter table public.recruitment_creatives drop constraint if exists recruitment_creatives_style_check;
alter table public.recruitment_creatives add constraint recruitment_creatives_style_check check (style in ('card','photo','text','notes'));

-- Pays de test (16/11, Max) : relecture des traductions par pays (FR/ES par Max, autres par un natif).
update public.settings set value = jsonb_set(value, '{checklist,translations}', '[
  {"country":"FR","lang":"fr","reviewer":"Max","done":false},
  {"country":"BE","lang":"fr","reviewer":"Max","done":false},
  {"country":"ES","lang":"es","reviewer":"Max","done":false},
  {"country":"MX","lang":"es","reviewer":"Max","done":false},
  {"country":"DE","lang":"de","reviewer":"natif","done":false},
  {"country":"IT","lang":"it","reviewer":"natif","done":false},
  {"country":"PL","lang":"pl","reviewer":"natif","done":false},
  {"country":"RS","lang":"sr","reviewer":"natif (latin)","done":false},
  {"country":"RO","lang":"ro","reviewer":"natif","done":false},
  {"country":"BG","lang":"bg","reviewer":"natif","done":false}
]'::jsonb, true) where key = 'meta';

-- Campagnes par zone (A/B/C) : la zone de la campagne, pour retrouver la bonne campagne quand on ajoute un pays.
alter table public.meta_campaigns add column if not exists zone_code text;
update public.meta_campaigns set zone_code = 'C' where meta_id = '52585282269809';

-- Création auto des pubs (PAUSED) dès que l'app Meta passe en Live : toutes les heures, pour les créas validées sans pub.
select cron.unschedule('vik_meta_pending_ads') where exists (select 1 from cron.job where jobname = 'vik_meta_pending_ads');
select cron.schedule('vik_meta_pending_ads', '25 * * * *', $$select public.call_function('meta', '{"action":"create_pending_ads"}')$$);
