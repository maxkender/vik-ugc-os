-- Créas : ligne « bonus aux vues » mise en avant (RPM de la zone), retour de Max du 16/11.
alter table public.recruitment_creatives add column if not exists bonus_line text;
