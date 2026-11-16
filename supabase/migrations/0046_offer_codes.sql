-- Codes promo Apple (App Store Offer Codes) : accès premium à l'app pour filmer la démo (16/11, Max).
-- Secrets à usage unique : jamais dans le repo, les logs ni l'UI en clair (masqués côté admin, « afficher » au clic, journalisé).
-- 1 code par créateur et par app, attribué automatiquement à la création du posteur (signature) ou au début du warm-up.

create table if not exists public.offer_codes (
  id bigserial primary key,
  app_id uuid not null references public.apps(id) on delete cascade,
  code text not null unique,
  url text not null,
  status text not null default 'available' check (status in ('available', 'assigned', 'redeemed', 'void')),
  assigned_to uuid references public.posters(id) on delete set null,
  assigned_at timestamptz,
  redeemed_at timestamptz,
  batch text,
  created_at timestamptz not null default now()
);
create index if not exists offer_codes_available on public.offer_codes (app_id, id) where status = 'available';
create unique index if not exists offer_codes_one_per_poster on public.offer_codes (app_id, assigned_to) where status in ('assigned', 'redeemed');
alter table public.offer_codes enable row level security;
-- Aucune lecture directe : tout passe par des fonctions (le posteur ne voit que son lien, l'admin des codes masqués).
drop policy if exists offer_codes_none on public.offer_codes;

-- Seuil d'alerte de stock.
insert into public.settings (key, value) values ('offer_codes', '{"low_stock": 500}'::jsonb) on conflict (key) do nothing;

-- Migration depuis la table d'import (lot du 16/11), puis suppression de l'import une fois la copie vérifiée.
do $$
declare v_app uuid; n_import int; n_copied int;
begin
  if to_regclass('public.offer_codes_import') is null then return; end if;
  select count(*) into n_import from public.offer_codes_import;
  insert into public.offer_codes (app_id, code, url, batch, created_at)
  select a.id, i.code, i.url, 'apple-' || to_char(coalesce(i.imported_at, now()), 'YYYY-MM-DD'), coalesce(i.imported_at, now())
  from public.offer_codes_import i
  join public.apps a on a.ios_url ~ ('/id' || i.app_store_id || '([/?]|$)')
  on conflict (code) do nothing;
  select count(*) into n_copied from public.offer_codes o where exists (select 1 from public.offer_codes_import i where i.code = o.code);
  if n_copied = n_import then
    drop table public.offer_codes_import;
  else
    raise notice 'offer_codes_import gardée : % importés sur %', n_copied, n_import;
  end if;
end $$;

-- Attribution (idempotente) : renvoie le code déjà attribué, sinon en réserve un disponible (verrou, jamais deux fois).
create or replace function public.assign_offer_code(p_poster uuid, p_app uuid default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_app uuid; v_id bigint;
begin
  v_app := coalesce(p_app, (select app_id from public.posters where id = p_poster), (select id from public.apps where name = 'Micabo' limit 1));
  if v_app is null or p_poster is null then return null; end if;
  select id into v_id from public.offer_codes where app_id = v_app and assigned_to = p_poster and status in ('assigned', 'redeemed') limit 1;
  if v_id is not null then return v_id; end if;
  select id into v_id from public.offer_codes where app_id = v_app and status = 'available' order by id limit 1 for update skip locked;
  if v_id is null then return null; end if; -- stock épuisé : alerte côté admin
  update public.offer_codes set status = 'assigned', assigned_to = p_poster, assigned_at = now() where id = v_id;
  return v_id;
end $$;
revoke execute on function public.assign_offer_code(uuid, uuid) from public, anon, authenticated;

-- Automatique : à la création du posteur (après signature) et au début du warm-up (filet de sécurité).
create or replace function public.offer_code_on_poster() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or (new.warmup_status = 'started' and old.warmup_status is distinct from 'started') then
    perform public.assign_offer_code(new.id, new.app_id);
  end if;
  return new;
end $$;
revoke execute on function public.offer_code_on_poster() from public, anon, authenticated;
drop trigger if exists posters_offer_code on public.posters;
create trigger posters_offer_code after insert or update of warmup_status on public.posters for each row execute function public.offer_code_on_poster();
-- Rattrapage pour les posteurs existants.
select public.assign_offer_code(id, app_id) from public.posters where status = 'active';

-- Posteur : son accès premium (lien de redemption Apple), attribué au besoin.
create or replace function public.poster_offer_code() returns table (app_name text, url text, status text)
language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  if not exists (select 1 from public.posters where id = auth.uid()) then return; end if;
  v_id := public.assign_offer_code(auth.uid(), null);
  return query select a.name, o.url, o.status from public.offer_codes o join public.apps a on a.id = o.app_id where o.id = v_id;
end $$;
-- Le posteur indique qu'il a activé son accès.
create or replace function public.poster_offer_code_redeemed() returns void
language sql security definer set search_path = public as $$
  update public.offer_codes set status = 'redeemed', redeemed_at = now() where assigned_to = auth.uid() and status = 'assigned';
$$;
revoke execute on function public.poster_offer_code(), public.poster_offer_code_redeemed() from public, anon;
grant execute on function public.poster_offer_code(), public.poster_offer_code_redeemed() to authenticated;

-- Admin : stock par app.
create or replace function public.admin_offer_code_stats() returns table (app_id uuid, app_name text, available bigint, assigned bigint, redeemed bigint, void bigint, low_stock int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query select a.id, a.name,
    count(*) filter (where o.status = 'available'), count(*) filter (where o.status = 'assigned'),
    count(*) filter (where o.status = 'redeemed'), count(*) filter (where o.status = 'void'),
    coalesce((select (value->>'low_stock')::int from public.settings where key = 'offer_codes'), 500)
  from public.apps a left join public.offer_codes o on o.app_id = a.id group by a.id, a.name order by a.name;
end $$;

-- Admin : codes attribués, masqués (2 premiers + 2 derniers caractères).
create or replace function public.admin_offer_codes_list(p_app uuid, p_limit int default 200)
returns table (id bigint, masked text, status text, assigned_to uuid, poster_name text, assigned_at timestamptz, redeemed_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query select o.id, left(o.code, 2) || repeat('•', greatest(length(o.code) - 4, 4)) || right(o.code, 2), o.status, o.assigned_to, p.display_name, o.assigned_at, o.redeemed_at
  from public.offer_codes o left join public.posters p on p.id = o.assigned_to
  where o.app_id = p_app and o.status <> 'available' order by o.assigned_at desc nulls last limit least(p_limit, 1000);
end $$;

-- Admin : afficher un code (au clic), journalisé.
create or replace function public.admin_reveal_offer_code(p_id bigint) returns text
language plpgsql security definer set search_path = public as $$
declare v text;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select code into v from public.offer_codes where id = p_id;
  insert into public.audit_log (actor, action, entity, entity_id, details) values (auth.uid(), 'offer_code.reveal', 'offer_codes', p_id::text, null);
  return v;
end $$;

-- Admin : réattribuer (le code actuel passe en « void », un nouveau est attribué).
create or replace function public.admin_reassign_offer_code(p_poster uuid, p_app uuid) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.offer_codes set status = 'void' where app_id = p_app and assigned_to = p_poster and status in ('assigned', 'redeemed');
  v_id := public.assign_offer_code(p_poster, p_app);
  insert into public.audit_log (actor, action, entity, entity_id, details) values (auth.uid(), 'offer_code.reassign', 'posters', p_poster::text, jsonb_build_object('new_id', v_id));
  return v_id;
end $$;

-- Admin : import CSV d'un nouveau lot ([{code, url}]), doublons ignorés.
create or replace function public.admin_import_offer_codes(p_app uuid, p_rows jsonb, p_batch text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n_in int; n_new int;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  n_in := jsonb_array_length(p_rows);
  with ins as (
    insert into public.offer_codes (app_id, code, url, batch)
    select p_app, trim(r->>'code'), coalesce(nullif(trim(r->>'url'), ''), 'https://apps.apple.com/redeem?ctx=offercodes&id=' || coalesce((select substring(ios_url from '/id(\d+)') from public.apps where id = p_app), '') || '&code=' || trim(r->>'code')), coalesce(p_batch, 'import-' || to_char(now(), 'YYYY-MM-DD'))
    from jsonb_array_elements(p_rows) r where coalesce(trim(r->>'code'), '') <> ''
    on conflict (code) do nothing returning 1)
  select count(*) into n_new from ins;
  insert into public.audit_log (actor, action, entity, entity_id, details) values (auth.uid(), 'offer_code.import', 'apps', p_app::text, jsonb_build_object('rows', n_in, 'new', n_new));
  return jsonb_build_object('rows', n_in, 'imported', n_new, 'duplicates', n_in - n_new);
end $$;

revoke execute on function public.admin_offer_code_stats(), public.admin_offer_codes_list(uuid, int), public.admin_reveal_offer_code(bigint),
  public.admin_reassign_offer_code(uuid, uuid), public.admin_import_offer_codes(uuid, jsonb, text) from public, anon;
grant execute on function public.admin_offer_code_stats(), public.admin_offer_codes_list(uuid, int), public.admin_reveal_offer_code(bigint),
  public.admin_reassign_offer_code(uuid, uuid), public.admin_import_offer_codes(uuid, jsonb, text) to authenticated;
