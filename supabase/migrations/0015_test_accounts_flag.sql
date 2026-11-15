-- Comptes de test (QA) : marqués is_test, exclus de la paie, des emails réels et des statistiques.
alter table public.profiles add column if not exists is_test boolean not null default false;

-- Fiche posteur du compte QA (France, zone A) + pool par défaut.
insert into public.posters (id, display_name, country, language, zone_code, status, app_id, started_at)
select p.id, 'QA Posteur', 'FR', 'fr', 'A', 'active', (select id from public.apps where slug = 'micabo'), current_date
from public.profiles p where p.email = 'qa-poster@vik-qa.test'
on conflict (id) do nothing;
insert into public.pool_members (pool_id, poster_id)
select (select id from public.pools order by created_at limit 1), p.id from public.profiles p where p.email = 'qa-poster@vik-qa.test'
on conflict do nothing;
