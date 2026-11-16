-- iPhone requis (16/11, Max) : écran « Gagnant-gagnant » de l'onboarding (versions précédentes archivées par le trigger) et contrat v5.
update public.onboarding_screens set body = body || ' Il te faut aussi un iPhone : l''app et l''accès premium qu''on te donne sont uniquement sur iPhone.' where key = 'win_win' and language = 'fr' and body not like '%iPhone%';
update public.onboarding_screens set body = body || ' You also need an iPhone: the app and the premium access we give you are iPhone only.' where key = 'win_win' and language = 'en' and body not like '%iPhone%';
update public.onboarding_screens set body = body || ' También necesitas un iPhone: la app y el acceso premium que te damos son solo para iPhone.' where key = 'win_win' and language = 'es' and body not like '%iPhone%';
update public.onboarding_screens set body = body || ' Außerdem brauchst du ein iPhone: Die App und der Premium-Zugang, den wir dir geben, gibt es nur für iPhone.' where key = 'win_win' and language = 'de' and body not like '%iPhone%';
update public.onboarding_screens set body = body || ' Ti serve anche un iPhone: l''app e l''accesso premium che ti diamo sono solo per iPhone.' where key = 'win_win' and language = 'it' and body not like '%iPhone%';

insert into public.contract_templates (country_code, language, title, body_md, version, active)
select country_code, language, title,
  replace(body_md, E'\n- Videos must comply with the platforms'' rules.',
    E'\n- Videos must comply with the platforms'' rules.\n- **Equipment:** the Creator must use an iPhone (iOS) to film, edit and publish the videos and to use the app; the premium access to the app provided by the Company (single-use Apple promo code) works on iPhone only.'),
  5, true
from public.contract_templates where active and version = 4 and language = 'en' and country_code is null
  and not exists (select 1 from public.contract_templates t where t.version = 5 and t.language = 'en' and t.country_code is null);
update public.contract_templates set active = false where version = 4 and language = 'en' and country_code is null
  and exists (select 1 from public.contract_templates t where t.version = 5 and t.language = 'en' and t.country_code is null);
