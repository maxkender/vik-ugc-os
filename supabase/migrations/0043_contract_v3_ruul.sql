-- Contrat v3 (16/11, Max) : responsabilité du créateur pour Ruul ; Vik Studios s'acquitte de son obligation de paiement
-- en envoyant le montant via Ruul. La v2 reste rattachée aux contrats déjà envoyés.
insert into public.contract_templates (country_code, language, title, body_md, version, active)
select country_code, language, title,
  replace(body_md,
    '- Payment is calculated weekly (Monday to Sunday) and paid through **Ruul** (ruul.io). The Creator must create and keep an active Ruul account; Ruul''s own terms apply to the payout.',
    '- Payment is calculated weekly (Monday to Sunday) and paid through **Ruul** (ruul.io). The Creator must create and keep an active Ruul account; Ruul''s own terms apply to the payout.
- **Ruul account and receipt of funds.** The Creator is solely responsible for setting up their Ruul account and for receiving the funds: providing correct bank details (IBAN or equivalent), completing Ruul''s identity verification, and bearing any Ruul fees, bank fees and taxes on their side. The Company fulfils its payment obligation by sending the amount due through Ruul to the Ruul account whose email the Creator provided. As long as the Creator''s Ruul account is not set up, amounts due are held and paid once it is.'),
  3, true
from public.contract_templates where active and version = 2 and language = 'en' and country_code is null
  and not exists (select 1 from public.contract_templates t where t.version = 3 and t.language = 'en' and t.country_code is null);
update public.contract_templates set active = false where version = 2 and language = 'en' and country_code is null
  and exists (select 1 from public.contract_templates t where t.version = 3 and t.language = 'en' and t.country_code is null);
