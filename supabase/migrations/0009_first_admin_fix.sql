-- Correctif (test E2E du 14/11) : un créateur signant avant la première connexion de l'admin devenait admin.
-- Le premier compte ne devient admin que s'il s'inscrit lui-même (pas de rôle imposé, pas créé par le service « contract »).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role public.user_role := 'poster';
begin
  if new.raw_app_meta_data ? 'role' then
    v_role := (new.raw_app_meta_data->>'role')::public.user_role;
  elsif coalesce(new.raw_user_meta_data->>'created_by', '') <> 'contract'
        and not exists (select 1 from public.profiles where role = 'admin') then
    v_role := 'admin';
  end if;
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), v_role)
  on conflict (id) do nothing;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
-- Le compte de test E2E créé ce soir redevient posteur.
update public.profiles set role = 'poster' where email = 'e2e-candidate@example.com';
