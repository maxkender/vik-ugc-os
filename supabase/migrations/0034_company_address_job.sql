-- Siège de Vik Studios SAS (16/11) ; SIREN facultatif (masqué s'il est vide). Le job : vidéos UGC tournées par le créateur.
update public.settings set value = value || '{"legal_address": "30 boulevard de Sébastopol, 75004 Paris, France", "contact_email": "support@vikstudios.com"}'::jsonb
  || case when value ? 'siren' then '{}'::jsonb else '{"siren": ""}'::jsonb end
where key = 'company';

update public.contract_templates set body_md = replace(body_md,
  '**Between:** {{company_name}} ("the Company")',
  '**Between:** {{company_name}}, {{company_address}}{{company_siren}} ("the Company")')
where body_md like '%**Between:** {{company_name}} ("the Company")%';

update public.contract_templates set body_md = replace(body_md,
  'The Creator agrees to create and publish short videos (UGC) promoting the Company''s mobile applications on the Creator''s own social media accounts (TikTok and/or Instagram), following the daily briefs provided in the Creator space.',
  'The Creator agrees to film their own original, good-quality short videos (UGC: face cam, reaction, tutorial, before/after…) with their phone and to publish them on the Creator''s own social media accounts (TikTok and/or Instagram) to promote the Company''s mobile applications, following the daily briefs provided in the Creator space (2 videos per day, posted consistently). Only videos validated by the Company are paid.')
where body_md like '%The Creator agrees to create and publish short videos (UGC)%';
