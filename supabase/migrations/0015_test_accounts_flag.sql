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

-- Toute adresse @vik-qa.test est un compte de test, y compris ceux créés par la signature d'un contrat.
create or replace function public.flag_test_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email ilike '%@vik-qa.test' then new.is_test := true; end if;
  return new;
end $$;
drop trigger if exists profiles_flag_test on public.profiles;
create trigger profiles_flag_test before insert or update of email on public.profiles for each row execute function public.flag_test_profile();
revoke execute on function public.flag_test_profile() from public, anon, authenticated;
update public.profiles set is_test = true where email ilike '%@vik-qa.test';
