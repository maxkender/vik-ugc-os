-- Modèles d'emails des relances d'onboarding (handles, premier post), EN / FR / ES.
insert into public.email_templates (key, language, subject, body, button_label) values
('handles_reminder','en','Set up your creator accounts',
 'Hi {first_name},

Next step: create your TikTok and Instagram creator accounts. In your creator space you will find 3 available usernames, your bio ready to copy and the profile photo tips.

Once created, paste your usernames there: we check them automatically.', 'Set up my accounts'),
('handles_reminder','fr','Crée tes comptes créateur',
 'Salut {first_name},

Prochaine étape : crée tes comptes TikTok et Instagram de créateur·rice. Dans ton espace, tu trouveras 3 noms d''utilisateur disponibles, ta bio prête à copier et les conseils pour la photo de profil.

Une fois créés, colle tes noms d''utilisateur dans ton espace : on les vérifie automatiquement.', 'Créer mes comptes'),
('handles_reminder','es','Crea tus cuentas de creador/a',
 'Hola {first_name}:

Siguiente paso: crea tus cuentas de TikTok e Instagram de creador/a. En tu espacio encontrarás 3 nombres de usuario disponibles, tu bio lista para copiar y consejos para la foto de perfil.

Cuando las tengas, pega tus nombres de usuario en tu espacio: los comprobamos automáticamente.', 'Crear mis cuentas'),
('first_post_reminder','en','Your first video is waiting',
 'Hi {first_name},

Your briefs for today are ready in your creator space: a reference video, a hook and simple instructions.

Post your first video and paste its link: that is how your first payment starts.', 'See my briefs'),
('first_post_reminder','fr','Ta première vidéo t''attend',
 'Salut {first_name},

Tes briefs du jour sont prêts dans ton espace : une vidéo de référence, un hook et des consignes simples.

Publie ta première vidéo et colle son lien : c''est comme ça que commence ton premier paiement.', 'Voir mes briefs'),
('first_post_reminder','es','Tu primer vídeo te espera',
 'Hola {first_name}:

Tus briefs de hoy están listos en tu espacio: un vídeo de referencia, un gancho e instrucciones sencillas.

Publica tu primer vídeo y pega su enlace: así empieza tu primer pago.', 'Ver mis briefs')
on conflict (key, language) do nothing;
