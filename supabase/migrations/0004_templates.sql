-- Modèles d'emails (EN + ES) et contrat par défaut. Éditables dans Réglages → Emails / Contrats.

insert into public.email_templates (key, language, subject, body, button_label) values
('application_received','en','We received your application',
 'Hi {first_name},

Thanks for applying to become a {brand} creator! We received your application and your intro video.

Our team reviews every application by hand. You will hear from us within a few days.', null),
('application_received','es','Hemos recibido tu candidatura',
 'Hola {first_name}:

¡Gracias por postularte como creador/a de {brand}! Hemos recibido tu candidatura y tu vídeo de presentación.

Nuestro equipo revisa cada candidatura a mano. Te responderemos en unos días.', null),

('contract_to_sign','en','Please sign your contract',
 'Hi {first_name},

Great news: your application has been accepted!

Next step: please read and sign your creator contract. You will earn {price_per_video} per video, plus a bonus of {rpm} per {rpm_views} views.

Please do not sign if you do not wish to continue. The link expires on {expires_on}.', 'Read and sign my contract'),
('contract_to_sign','es','Firma tu contrato',
 'Hola {first_name}:

¡Buenas noticias: tu candidatura ha sido aceptada!

Siguiente paso: lee y firma tu contrato de creador/a. Ganarás {price_per_video} por vídeo, más un bonus de {rpm} por cada {rpm_views} visualizaciones.

No firmes si no deseas continuar. El enlace caduca el {expires_on}.', 'Leer y firmar mi contrato'),

('contract_reminder','en','Reminder: your contract is waiting',
 'Hi {first_name},

Your creator contract is still waiting for your signature. It expires on {expires_on}.

Please do not sign if you do not wish to continue.', 'Read and sign my contract'),
('contract_reminder','es','Recordatorio: tu contrato te espera',
 'Hola {first_name}:

Tu contrato de creador/a sigue pendiente de firma. Caduca el {expires_on}.

No firmes si no deseas continuar.', 'Leer y firmar mi contrato'),

('contract_signed','en','Your signed contract',
 'Hi {first_name},

Thank you, your contract is signed. You can download your signed copy below.

You will receive your access in a separate email.', 'Download my contract'),
('contract_signed','es','Tu contrato firmado',
 'Hola {first_name}:

Gracias, tu contrato está firmado. Puedes descargar tu copia firmada aquí abajo.

Recibirás tus accesos en otro email.', 'Descargar mi contrato'),

('access','en','Your access',
 'Hi {first_name},

Welcome to {brand}! Your creator space is ready: every day you will find your 2 video briefs there, and you will track your views and payments.

Click the button below to log in (the link works once; you can always ask for a new one on the login page).', 'Open my creator space'),
('access','es','Tus accesos',
 'Hola {first_name}:

¡Bienvenido/a a {brand}! Tu espacio de creador/a está listo: cada día encontrarás tus 2 briefs de vídeo y podrás seguir tus visualizaciones y pagos.

Haz clic en el botón para entrar (el enlace funciona una vez; puedes pedir otro en la página de acceso).', 'Abrir mi espacio'),

('application_rejected','en','Your application',
 'Hi {first_name},

Thank you for your interest in becoming a {brand} creator and for the time you spent on your application.

Unfortunately we cannot move forward with your application at this time. We wish you all the best.', null),
('application_rejected','es','Tu candidatura',
 'Hola {first_name}:

Gracias por tu interés en ser creador/a de {brand} y por el tiempo dedicado a tu candidatura.

Lamentablemente no podemos seguir adelante con tu candidatura por ahora. Te deseamos lo mejor.', null),

('ruul_invite','en','Get paid: accept your Ruul invitation',
 'Hi {first_name},

We pay our creators every week through Ruul. We just added you on Ruul with {ruul_email}: you should have received an invitation from Ruul.

1. Open the Ruul email and create your account.
2. Complete your profile (ID and payout method).
3. Come back to your dashboard and click "It''s done".', 'Open my dashboard'),
('ruul_invite','es','Cobra: acepta tu invitación de Ruul',
 'Hola {first_name}:

Pagamos a nuestros creadores cada semana a través de Ruul. Te hemos añadido en Ruul con {ruul_email}: deberías haber recibido una invitación de Ruul.

1. Abre el email de Ruul y crea tu cuenta.
2. Completa tu perfil (documento de identidad y método de cobro).
3. Vuelve a tu espacio y haz clic en «It''s done».', 'Abrir mi espacio'),

('ruul_reminder','en','Reminder: finish your Ruul setup',
 'Hi {first_name},

To get paid, please accept the Ruul invitation sent to {ruul_email}, complete your profile, then click "It''s done" on your dashboard.', 'Open my dashboard'),
('ruul_reminder','es','Recordatorio: termina tu alta en Ruul',
 'Hola {first_name}:

Para cobrar, acepta la invitación de Ruul enviada a {ruul_email}, completa tu perfil y luego haz clic en «It''s done» en tu espacio.', 'Abrir mi espacio'),

('payout_paid','en','You received {total} for the week of {week}',
 'Hi {first_name},

You received {total} for the week of {week}: {videos} videos ({base}) + views bonus ({bonus}).

The payment was sent through Ruul. You can see the line-by-line details on your dashboard.', 'See the details'),
('payout_paid','es','Has recibido {total} por la semana del {week}',
 'Hola {first_name}:

Has recibido {total} por la semana del {week}: {videos} vídeos ({base}) + bonus de visualizaciones ({bonus}).

El pago se ha enviado a través de Ruul. Puedes ver el detalle línea por línea en tu espacio.', 'Ver el detalle')
on conflict (key, language) do nothing;

-- Contrat par défaut (anglais). Un modèle par pays peut le remplacer (country_code).
insert into public.contract_templates (country_code, language, title, body_md, version)
select null, 'en', 'Independent Creator Agreement', $md$
# Independent Creator Agreement

**Between:** {{company_name}} ("the Company")
**And:** {{full_name}}, born on {{birthdate}}, resident in {{country_name}} ("the Creator")

**Date:** {{date}}

## 1. Purpose
The Creator agrees to create and publish short videos (UGC) promoting the Company's mobile applications on the Creator's own social media accounts (TikTok and/or Instagram), following the daily briefs provided in the Creator space.

## 2. Independent status
The Creator acts as an **independent contractor**. Nothing in this agreement creates an employment relationship, partnership or agency. The Creator is free to organise their work, uses their own equipment, and may work for other clients, except direct competitors of the promoted applications during the term of this agreement.

## 3. Deliverables
- Target: **{{videos_per_day}} videos per day**, following the briefs (hook, instructions, reference video).
- Each video is published on the Creator's account and its link is submitted in the Creator space.
- Videos must comply with the platforms' rules, including paid-partnership / advertising disclosure where required by local law.

## 4. Compensation
- **{{price_per_video}} per validated video** (zone {{zone_code}}, currency {{currency}}).
- **Views bonus:** {{rpm}} per {{rpm_views}} views, measured 7 days after publication (D+7).
- Payment is calculated weekly (Monday to Sunday) and paid through **Ruul** (ruul.io). The Creator must create and keep an active Ruul account; Ruul's own terms apply to the payout.
- The Company may refuse to validate a video that does not follow the brief or the platform rules; refused videos are not paid.

## 5. Taxes and social contributions
The Creator is solely responsible for declaring their income and paying any taxes and social contributions due in their country of residence.

{{country_clauses}}

## 6. Rights on content
The Creator grants the Company a worldwide, non-exclusive, royalty-free licence to reuse, repost and use the videos produced under this agreement in organic and paid advertising (including "Spark Ads" codes and Meta ads), for 2 years from publication. The Creator guarantees they hold the rights to everything that appears in the videos (music used through the platform's library, people filmed with their consent).

## 7. Confidentiality
Briefs, rates and any non-public information shared by the Company are confidential.

## 8. Term and termination
This agreement starts on the date of signature and has no fixed term. Either party may end it at any time by written notice (email). Videos validated before termination are paid.

## 9. Age
The Creator confirms they are at least 18 years old.

## 10. Personal data
The Company processes the Creator's personal data (identity, contact, account statistics, payout information) only to manage this agreement, in accordance with applicable data-protection law (GDPR for EU residents). The Creator may request access or deletion at any time.

## 11. Governing law
This agreement is governed by French law. [À VALIDER PAR MAX/JURIDIQUE]

---
*Signed electronically by typing the full name and ticking "I accept". The signature record (timestamp, IP address, user agent and SHA-256 hash of this document) is kept by the Company.*
$md$, 1
where not exists (select 1 from public.contract_templates where country_code is null and language = 'en');

-- Clauses spécifiques par pays (Ruul / fiscalité). [À VALIDER PAR MAX/JURIDIQUE]
update public.countries set contract_clauses = case
  when code in ('FR','BE','LU','DE','AT','NL','IE','ES','IT','PT','GR','PL','CZ','SK','HU','SI','HR','EE','LV','LT','RO','BG','DK','SE','FI') then
    '**Country notes (EU):** the Creator invoices through Ruul as an independent contractor. Depending on the country, a self-employed registration (e.g. micro-entrepreneur in France, autónomo in Spain) may be required beyond occasional income thresholds. [À VALIDER PAR MAX/JURIDIQUE]'
  when code in ('US') then
    '**Country notes (US):** Ruul may ask for a W-9 form. The Creator is responsible for self-employment tax. [À VALIDER PAR MAX/JURIDIQUE]'
  when code in ('GB') then
    '**Country notes (UK):** income above the £1,000 trading allowance must be declared via Self Assessment. [À VALIDER PAR MAX/JURIDIQUE]'
  when code in ('BR','AR','CO','MX','CL','UY','PE','EC') then
    '**Country notes (Latin America):** payouts through Ruul to a local bank account or supported method; local tax declaration rules apply. [À VALIDER PAR MAX/JURIDIQUE]'
  else
    '**Country notes:** payouts through Ruul; Ruul verifies identity (government ID) and the payout account. Local tax rules apply. [À VALIDER PAR MAX/JURIDIQUE]'
  end
where contract_clauses is null;

insert into public.settings (key, value) values
  ('company', jsonb_build_object('name', 'Vik Studios SAS', 'brand', 'Vik Studios', 'legal_address', '[À COMPLÉTER]'))
on conflict (key) do nothing;
