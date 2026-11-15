-- Modèles d'emails en français (les candidats FR/BE/LU/MA recevaient l'anglais).
insert into public.email_templates (key, language, subject, body, button_label) values
('application_received','fr','On a bien reçu ta candidature',
 'Salut {first_name},

Merci d''avoir postulé pour devenir créateur·rice {brand} ! On a bien reçu ta candidature et ta vidéo de présentation.

Notre équipe relit chaque candidature à la main. Tu auras de nos nouvelles d''ici quelques jours.', null),
('contract_to_sign','fr','Signe ton contrat',
 'Salut {first_name},

Bonne nouvelle : ta candidature est acceptée !

Prochaine étape : lis et signe ton contrat de créateur·rice. Tu gagneras {price_per_video} par vidéo, plus un bonus de {rpm} pour {rpm_views} vues.

Ne signe pas si tu ne souhaites pas continuer. Le lien expire le {expires_on}.', 'Lire et signer mon contrat'),
('contract_reminder','fr','Rappel : ton contrat t''attend',
 'Salut {first_name},

Ton contrat de créateur·rice attend toujours ta signature. Il expire le {expires_on}.

Ne signe pas si tu ne souhaites pas continuer.', 'Lire et signer mon contrat'),
('contract_signed','fr','Ton contrat signé',
 'Salut {first_name},

Merci, ton contrat est signé. Tu peux télécharger ta copie signée ci-dessous.

Tu vas recevoir tes accès dans un autre email.', 'Télécharger mon contrat'),
('access','fr','Tes accès',
 'Salut {first_name},

Bienvenue chez {brand} ! Ton espace créateur·rice est prêt : chaque jour tu y trouveras tes 2 briefs vidéo, et tu pourras suivre tes vues et tes paiements.

Clique sur le bouton pour te connecter (le lien ne sert qu''une fois ; tu peux en redemander un sur la page de connexion).', 'Ouvrir mon espace'),
('application_rejected','fr','Ta candidature',
 'Salut {first_name},

Merci pour ton intérêt et pour le temps passé sur ta candidature.

Malheureusement, on ne peut pas donner suite pour le moment. On te souhaite le meilleur.', null),
('ruul_invite','fr','Être payé·e : accepte ton invitation Ruul',
 'Salut {first_name},

On paie nos créateurs chaque semaine via Ruul. On vient de t''ajouter sur Ruul avec {ruul_email} : tu as dû recevoir une invitation de Ruul.

1. Ouvre l''email de Ruul et crée ton compte.
2. Complète ton profil (pièce d''identité et moyen de paiement).
3. Reviens sur ton espace et clique sur « It''s done ».', 'Ouvrir mon espace'),
('ruul_reminder','fr','Rappel : termine ton inscription Ruul',
 'Salut {first_name},

Pour être payé·e, accepte l''invitation Ruul envoyée à {ruul_email}, complète ton profil, puis clique sur « It''s done » dans ton espace.', 'Ouvrir mon espace'),
('payout_paid','fr','Tu as reçu {total} pour la semaine du {week}',
 'Salut {first_name},

Tu as reçu {total} pour la semaine du {week} : {videos} vidéos ({base}) + bonus vues ({bonus}).

Le paiement a été envoyé via Ruul. Le détail ligne par ligne est dans ton espace.', 'Voir le détail')
on conflict (key, language) do nothing;
