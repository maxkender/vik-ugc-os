-- Vik UGC OS — rôles, helpers et RLS stricte.

create or replace function public.current_role_name() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','recruiter'))
$$;

-- Le recruteur ne voit que ses pays ; l'admin voit tout.
create or replace function public.can_see_country(p_country text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid()
       and (role = 'admin' or (role = 'recruiter' and p_country = any(recruiter_countries)))
  )
$$;

-- Création du profil à l'inscription. Le premier compte devient admin.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role public.user_role := 'poster';
begin
  if not exists (select 1 from public.profiles where role = 'admin') then
    v_role := 'admin';
  end if;
  if new.raw_app_meta_data ? 'role' then
    v_role := (new.raw_app_meta_data->>'role')::public.user_role;
  end if;
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), v_role)
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Promotion manuelle (SQL editor) : select public.promote_admin('max@…');
create or replace function public.promote_admin(p_email text) returns text
language sql security definer set search_path = public as $$
  update public.profiles set role = 'admin' where lower(email) = lower(p_email) returning email
$$;
revoke execute on function public.promote_admin(text) from public, anon, authenticated;

-- Un profil ne peut pas changer son propre rôle.
create or replace function public.guard_profile_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.recruiter_countries is distinct from old.recruiter_countries)
     and auth.uid() is not null and not public.is_admin() then
    raise exception 'Seul un admin peut changer un rôle';
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role before update on public.profiles
  for each row execute function public.guard_profile_role();

-- ───────────── activer RLS partout ─────────────
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- profils
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for select to authenticated using (id = auth.uid() or public.is_staff());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin());

-- Tables d'administration pure : admin en écriture, staff en lecture.
do $$
declare t text;
begin
  foreach t in array array['settings','apps','competitors','sources','agent_runs','categories','videos','video_metrics',
                           'collections','collection_videos','pools','pool_members','briefs','contract_templates',
                           'email_templates','email_outbox','meta_campaigns','meta_adsets','meta_ads','meta_insights',
                           'recruitment_creatives','payouts','paid_ad_candidates','audit_log','zones','countries'] loop
    execute format('drop policy if exists %I on public.%I', t || '_staff_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_staff())', t || '_staff_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin_write', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_admin_write', t);
  end loop;
end $$;

-- Public (landing) : zones et pays ouverts en lecture anonyme (tarifs affichés).
drop policy if exists zones_public on public.zones;
create policy zones_public on public.zones for select to anon, authenticated using (active);
drop policy if exists countries_public on public.countries;
create policy countries_public on public.countries for select to anon, authenticated using (true);
drop policy if exists apps_public on public.apps;
create policy apps_public on public.apps for select to anon, authenticated using (active);

-- Favoris : chacun les siens (staff).
drop policy if exists favorites_own on public.favorites;
create policy favorites_own on public.favorites for all to authenticated
  using (user_id = auth.uid() and public.is_staff()) with check (user_id = auth.uid() and public.is_staff());

-- Collections : le staff peut en créer.
drop policy if exists collections_staff_write on public.collections;
create policy collections_staff_write on public.collections for all to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists collection_videos_staff_write on public.collection_videos;
create policy collection_videos_staff_write on public.collection_videos for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Candidatures : recruteur limité à ses pays. L'insertion publique passe par l'edge function `apply` (service role).
drop policy if exists applications_read on public.applications;
create policy applications_read on public.applications for select to authenticated using (public.can_see_country(country));
drop policy if exists applications_write on public.applications;
create policy applications_write on public.applications for update to authenticated using (public.can_see_country(country)) with check (public.can_see_country(country));
drop policy if exists applications_delete on public.applications;
create policy applications_delete on public.applications for delete to authenticated using (public.is_admin());

-- Contrats : lecture staff sur le pays de la candidature ; signature publique via edge function `contracts`.
drop policy if exists contracts_read on public.contracts;
create policy contracts_read on public.contracts for select to authenticated using (
  public.is_admin() or exists (select 1 from public.applications a where a.id = application_id and public.can_see_country(a.country))
  or exists (select 1 from public.applications a where a.id = application_id and a.poster_id = auth.uid())
);
drop policy if exists contracts_admin on public.contracts;
create policy contracts_admin on public.contracts for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Posteurs : le posteur se voit, le staff voit ses pays.
drop policy if exists posters_read on public.posters;
create policy posters_read on public.posters for select to authenticated using (id = auth.uid() or public.can_see_country(country));
drop policy if exists posters_admin on public.posters;
create policy posters_admin on public.posters for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Le posteur modifie seulement ses champs Ruul / handles via la RPC poster_update_self.
create or replace function public.poster_update_self(p_ruul_email text default null, p_tiktok text default null, p_instagram text default null, p_ruul_done boolean default null)
returns public.posters language plpgsql security definer set search_path = public as $$
declare r public.posters;
begin
  update public.posters set
    ruul_email = coalesce(nullif(trim(p_ruul_email), ''), ruul_email),
    ruul_status = case
      when p_ruul_done is true and ruul_status in ('added','email_given') then 'done'
      when nullif(trim(p_ruul_email), '') is not null and ruul_status = 'none' then 'email_given'
      else ruul_status end,
    ruul_done_at = case when p_ruul_done is true and ruul_status in ('added','email_given') then now() else ruul_done_at end,
    tiktok_handle = coalesce(nullif(trim(p_tiktok), ''), tiktok_handle),
    instagram_handle = coalesce(nullif(trim(p_instagram), ''), instagram_handle)
  where id = auth.uid()
  returning * into r;
  if r.id is null then raise exception 'not a poster'; end if;
  return r;
end $$;
grant execute on function public.poster_update_self(text, text, text, boolean) to authenticated;

-- Briefs : le posteur lit les briefs qui lui sont assignés.
drop policy if exists briefs_poster_read on public.briefs;
create policy briefs_poster_read on public.briefs for select to authenticated using (
  exists (select 1 from public.brief_assignments ba where ba.brief_id = briefs.id and ba.poster_id = auth.uid())
);
-- La vidéo de référence d'un brief assigné est lisible par le posteur.
drop policy if exists videos_poster_read on public.videos;
create policy videos_poster_read on public.videos for select to authenticated using (
  exists (select 1 from public.briefs b join public.brief_assignments ba on ba.brief_id = b.id
           where b.reference_video_id = videos.id and ba.poster_id = auth.uid())
);

-- Assignations : le posteur lit les siennes ; il soumet son lien via la RPC submit_post.
drop policy if exists assignments_read on public.brief_assignments;
create policy assignments_read on public.brief_assignments for select to authenticated using (
  poster_id = auth.uid() or public.is_staff()
);
drop policy if exists assignments_admin on public.brief_assignments;
create policy assignments_admin on public.brief_assignments for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.submit_post(p_assignment uuid, p_url text) returns public.brief_assignments
language plpgsql security definer set search_path = public as $$
declare r public.brief_assignments; v_platform text;
begin
  if p_url !~* '^https?://' then raise exception 'invalid url'; end if;
  v_platform := case when p_url ~* 'tiktok\.com' then 'tiktok' when p_url ~* 'instagram\.com' then 'instagram' else 'other' end;
  update public.brief_assignments
     set posted_url = trim(p_url), posted_platform = v_platform, posted_at = coalesce(posted_at, now()),
         status = case when status = 'todo' or status = 'rejected' then 'posted' else status end
   where id = p_assignment and poster_id = auth.uid() and status <> 'validated'
   returning * into r;
  if r.id is null then raise exception 'assignment not found'; end if;
  return r;
end $$;
grant execute on function public.submit_post(uuid, text) to authenticated;

-- Paie : le posteur lit ses lignes.
drop policy if exists payouts_poster_read on public.payouts;
create policy payouts_poster_read on public.payouts for select to authenticated using (poster_id = auth.uid());

-- Pools : lecture posteur de ses appartenances.
drop policy if exists pool_members_self on public.pool_members;
create policy pool_members_self on public.pool_members for select to authenticated using (poster_id = auth.uid());

-- Les fonctions SECURITY DEFINER ne sont pas exposées à anon.
revoke execute on function public.submit_post(uuid, text) from anon;
revoke execute on function public.poster_update_self(text, text, text, boolean) from anon;
