-- Durcissement (advisors Supabase du 14/11).
alter function public.immutable_join(text[]) set search_path = public;
alter function public.touch_updated_at() set search_path = public;

-- Extensions inutilisées ou mal rangées.
drop extension if exists pg_trgm;
drop extension if exists unaccent;
drop extension if exists pg_net;
create extension if not exists pg_net with schema extensions;

-- Fonctions SECURITY DEFINER : jamais pour anon ; triggers jamais appelables en RPC.
revoke execute on function public.can_see_country(text), public.current_role_name(), public.is_admin(), public.is_staff(),
  public.poster_update_self(text, text, text, boolean), public.submit_post(uuid, text),
  public.handle_new_user(), public.guard_profile_role(), public.mark_application_active() from public, anon;
revoke execute on function public.handle_new_user(), public.guard_profile_role(), public.mark_application_active() from authenticated;
grant execute on function public.can_see_country(text), public.current_role_name(), public.is_admin(), public.is_staff(),
  public.poster_update_self(text, text, text, boolean), public.submit_post(uuid, text) to authenticated;
