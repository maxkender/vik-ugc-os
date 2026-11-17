-- Candidature sans vidéo (17/11) : nouveaux statuts (fichier séparé : ADD VALUE hors transaction).
alter type public.application_status add value if not exists 'video_pending';
alter type public.application_status add value if not exists 'expired';
