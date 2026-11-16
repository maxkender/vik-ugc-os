-- Contrat v4 (16/11, Max) : pas de mention de publicité demandée aux créateurs. La v3 reste rattachée aux contrats envoyés.
insert into public.contract_templates (country_code, language, title, body_md, version, active)
select country_code, language, title,
  replace(body_md, E'\n- Videos must comply with the platforms'' rules, including paid-partnership / advertising disclosure where required by local law.', E'\n- Videos must comply with the platforms'' rules.'),
  4, true
from public.contract_templates where active and version = 3 and language = 'en' and country_code is null
  and not exists (select 1 from public.contract_templates t where t.version = 4 and t.language = 'en' and t.country_code is null);
update public.contract_templates set active = false where version = 3 and language = 'en' and country_code is null
  and exists (select 1 from public.contract_templates t where t.version = 4 and t.language = 'en' and t.country_code is null);
