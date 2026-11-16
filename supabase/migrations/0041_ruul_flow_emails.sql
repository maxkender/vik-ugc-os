-- Flux Ruul clarifié (16/11, Max) : Ruul n'écrit pas aux créateurs. Le créateur crée lui-même son compte Ruul
-- (IBAN + vérification d'identité), nous donne l'email de ce compte, on l'ajoute comme contractor, et C'EST NOUS
-- qui lui écrivons à chaque étape. Les anciennes versions sont archivées par le trigger (email_template_versions).

-- Accès : on ajoute la marche à suivre Ruul.
update public.email_templates set body = body || E'\n\nPour être payé·e : crée ton compte sur ruul.io (IBAN + vérification d''identité), puis indique son email dans ton espace → Paiements. Le guide pas à pas y est. Ruul ne t''écrira pas : c''est nous qui te tenons au courant.'
where key = 'access' and language = 'fr' and body not like '%ruul.io%';
update public.email_templates set body = body || E'\n\nTo get paid: create your account at ruul.io (bank details + identity check), then enter its email in your space → Payments. The step-by-step guide is there. Ruul won''t email you: we keep you posted.'
where key = 'access' and language = 'en' and body not like '%ruul.io%';
update public.email_templates set body = body || E'\n\nPara cobrar: crea tu cuenta en ruul.io (cuenta bancaria + verificación de identidad) y luego escribe su email en tu espacio → Pagos. Ahí está la guía paso a paso. Ruul no te escribirá: nosotros te mantenemos al tanto.'
where key = 'access' and language = 'es' and body not like '%ruul.io%';

-- « Tu as été ajouté·e sur Ruul » : envoyé par nous quand l'admin clique « Ajouté sur Ruul ».
update public.email_templates set subject = 'Tu as été ajouté·e sur Ruul : accepte l''invitation', button_label = 'Ouvrir mon espace', body =
'Salut {first_name},

Bonne nouvelle : on vient de t''ajouter comme créateur·rice (contractor) sur Ruul, avec le compte {ruul_email}.

1. Connecte-toi sur ruul.io avec ce compte.
2. Accepte l''invitation de Vik Studios (elle apparaît dans ton tableau de bord Ruul).
3. Vérifie que ton IBAN et ta vérification d''identité sont bien terminés.
4. Reviens dans ton espace → Paiements et clique sur « It''s done ».

Ruul ne t''enverra pas d''email de notre part : toutes les infos viennent de nous.'
where key = 'ruul_invite' and language = 'fr';
update public.email_templates set subject = 'You''ve been added on Ruul: accept the invitation', button_label = 'Open my space', body =
'Hi {first_name},

Good news: we''ve just added you as a creator (contractor) on Ruul, with the account {ruul_email}.

1. Log in at ruul.io with that account.
2. Accept the Vik Studios invitation (it shows in your Ruul dashboard).
3. Check that your bank details and identity check are complete.
4. Come back to your space → Payments and tap “It''s done”.

Ruul won''t email you on our behalf: all the info comes from us.'
where key = 'ruul_invite' and language = 'en';
update public.email_templates set subject = 'Te agregamos en Ruul: acepta la invitación', button_label = 'Abrir mi espacio', body =
'Hola {first_name}:

Buenas noticias: te acabamos de agregar como creador/a (contractor) en Ruul, con la cuenta {ruul_email}.

1. Inicia sesión en ruul.io con esa cuenta.
2. Acepta la invitación de Vik Studios (aparece en tu panel de Ruul).
3. Revisa que tu cuenta bancaria y tu verificación de identidad estén completas.
4. Vuelve a tu espacio → Pagos y toca «It''s done».

Ruul no te enviará emails de nuestra parte: toda la información viene de nosotros.'
where key = 'ruul_invite' and language = 'es';

-- Relance : renvoie à nos propres emails et au guide de l'espace.
update public.email_templates set subject = 'Rappel : ton compte Ruul pour être payé·e', button_label = 'Voir le guide Ruul', body =
'Salut {first_name},

Petit rappel : tant que Ruul n''est pas configuré, on ne peut pas te payer.

- Pas encore de compte Ruul ? Crée-le sur ruul.io (IBAN + vérification d''identité), puis indique son email dans ton espace → Paiements.
- Déjà ajouté·e ? Comme indiqué dans notre email « Tu as été ajouté·e sur Ruul », connecte-toi sur ruul.io avec {ruul_email}, accepte l''invitation de Vik Studios, puis clique sur « It''s done » dans ton espace.

Le guide pas à pas est dans ton espace → Paiements.'
where key = 'ruul_reminder' and language = 'fr';
update public.email_templates set subject = 'Reminder: your Ruul account to get paid', button_label = 'See the Ruul guide', body =
'Hi {first_name},

Quick reminder: until Ruul is set up, we can''t pay you.

- No Ruul account yet? Create it at ruul.io (bank details + identity check), then enter its email in your space → Payments.
- Already added? As explained in our email “You''ve been added on Ruul”, log in at ruul.io with {ruul_email}, accept the Vik Studios invitation, then tap “It''s done” in your space.

The step-by-step guide is in your space → Payments.'
where key = 'ruul_reminder' and language = 'en';
update public.email_templates set subject = 'Recordatorio: tu cuenta de Ruul para cobrar', button_label = 'Ver la guía de Ruul', body =
'Hola {first_name}:

Un recordatorio: mientras Ruul no esté configurado, no podemos pagarte.

- ¿Aún no tienes cuenta de Ruul? Créala en ruul.io (cuenta bancaria + verificación de identidad) y escribe su email en tu espacio → Pagos.
- ¿Ya te agregamos? Como te explicamos en nuestro email «Te agregamos en Ruul», inicia sesión en ruul.io con {ruul_email}, acepta la invitación de Vik Studios y toca «It''s done» en tu espacio.

La guía paso a paso está en tu espacio → Pagos.'
where key = 'ruul_reminder' and language = 'es';

-- Paiement envoyé.
update public.email_templates set body = replace(body, 'Le paiement a été envoyé via Ruul.', 'Le paiement a été envoyé via Ruul : il apparaît dans ton compte Ruul, qui le verse sur ton IBAN.')
where key = 'payout_paid' and language = 'fr';
update public.email_templates set body = replace(body, 'The payment was sent through Ruul.', 'The payment was sent through Ruul: it shows in your Ruul account, which pays it out to your bank account.')
where key = 'payout_paid' and language = 'en';
update public.email_templates set body = replace(body, 'El pago se ha enviado a través de Ruul.', 'El pago se ha enviado a través de Ruul: aparece en tu cuenta de Ruul, que lo transfiere a tu cuenta bancaria.')
where key = 'payout_paid' and language = 'es';
