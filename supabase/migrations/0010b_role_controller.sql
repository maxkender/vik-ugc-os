-- (voir 0011) : à exécuter seul, hors transaction
alter type public.user_role add value if not exists 'controller';
