-- Warm-up obligatoire de 24 h (16/11, Max) : après la création des comptes TikTok et Instagram, avant le 1er brief.
-- Sur les 2 comptes : ~15 min de scroll dans la niche, s'abonner à 10–15 comptes de la niche, compléter le profil,
-- ne rien poster. Minuteur de 24 h dès « J'ai commencé » ; validation à la fin (capture du fil « Pour toi » en option).
-- Aucun brief n'est assigné tant que le warm-up n'est pas validé.

alter table public.posters add column if not exists warmup_status text not null default 'none'
  check (warmup_status in ('none', 'started', 'validated'));
alter table public.posters add column if not exists warmup_started_at timestamptz;
alter table public.posters add column if not exists warmup_validated_at timestamptz;
alter table public.posters add column if not exists warmup_checks jsonb not null default '{}';
alter table public.posters add column if not exists warmup_proof_path text;

-- Réglage : durée (heures) et cases obligatoires par plateforme.
insert into public.settings (key, value) values ('warmup', jsonb_build_object(
  'hours', 24,
  'required', jsonb_build_array('tiktok_follow', 'tiktok_scroll', 'tiktok_profile', 'tiktok_no_post',
                                'instagram_follow', 'instagram_scroll', 'instagram_profile', 'instagram_no_post')))
on conflict (key) do nothing;

-- Le posteur démarre son warm-up (une seule fois : le minuteur ne repart pas de zéro).
create or replace function public.poster_warmup_start() returns public.posters
language plpgsql security definer set search_path = public as $$
declare r public.posters;
begin
  update public.posters set warmup_status = 'started', warmup_started_at = now()
  where id = auth.uid() and warmup_status = 'none' returning * into r;
  if r.id is null then select * into r from public.posters where id = auth.uid(); end if;
  if r.id is null then raise exception 'not a poster'; end if;
  insert into public.onboarding_events (application_id, poster_id, step)
  select r.application_id, r.id, 'warmup_started'
  where not exists (select 1 from public.onboarding_events where poster_id = r.id and step = 'warmup_started');
  return r;
end $$;

-- Cases cochées et capture (chemin dans le bucket warmup-proofs).
create or replace function public.poster_warmup_save(p_checks jsonb, p_proof text default null) returns public.posters
language plpgsql security definer set search_path = public as $$
declare r public.posters;
begin
  update public.posters set warmup_checks = coalesce(p_checks, '{}'::jsonb),
    warmup_proof_path = coalesce(nullif(p_proof, ''), warmup_proof_path)
  where id = auth.uid() and warmup_status <> 'validated' returning * into r;
  if r.id is null then select * into r from public.posters where id = auth.uid(); end if;
  return r;
end $$;

-- Validation : seulement après la durée réglée et avec toutes les cases obligatoires.
create or replace function public.poster_warmup_validate() returns public.posters
language plpgsql security definer set search_path = public as $$
declare r public.posters; cfg jsonb; k text;
begin
  select * into r from public.posters where id = auth.uid();
  if r.id is null then raise exception 'not a poster'; end if;
  if r.warmup_status = 'validated' then return r; end if;
  if r.warmup_status <> 'started' or r.warmup_started_at is null then raise exception 'warmup_not_started'; end if;
  select value into cfg from public.settings where key = 'warmup';
  if now() < r.warmup_started_at + make_interval(hours => coalesce((cfg->>'hours')::int, 24)) then raise exception 'warmup_too_early'; end if;
  for k in select jsonb_array_elements_text(coalesce(cfg->'required', '[]'::jsonb)) loop
    if coalesce((r.warmup_checks->>k)::boolean, false) is not true then raise exception 'warmup_incomplete'; end if;
  end loop;
  update public.posters set warmup_status = 'validated', warmup_validated_at = now() where id = r.id returning * into r;
  insert into public.onboarding_events (application_id, poster_id, step) values (r.application_id, r.id, 'warmup_done');
  return r;
end $$;

-- Validation (ou réinitialisation) par un admin, par exemple après vérification de la capture.
create or replace function public.admin_set_warmup(p_poster uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  if p_status not in ('none', 'started', 'validated') then raise exception 'bad status'; end if;
  update public.posters set warmup_status = p_status,
    warmup_started_at = case when p_status = 'none' then null else coalesce(warmup_started_at, now()) end,
    warmup_validated_at = case when p_status = 'validated' then now() else null end
  where id = p_poster;
  if p_status = 'validated' then
    insert into public.onboarding_events (application_id, poster_id, step, meta)
    select application_id, id, 'warmup_done', jsonb_build_object('by', auth.uid()) from public.posters where id = p_poster;
  end if;
end $$;

-- Comptes de la niche à suivre : vrais auteurs de la bibliothèque (vidéos organiques compatibles avec l'app du posteur),
-- par plateforme, dans sa langue en priorité. Aucun handle inventé.
create or replace function public.poster_warmup_accounts(p_limit int default 15)
returns table (platform public.platform, handle text, views bigint, url text)
language sql stable security definer set search_path = public as $$
  with me as (
    select p.language, coalesce(p.app_id, (select id from public.apps where name = 'Micabo' limit 1)) app_id
    from public.posters p where p.id = auth.uid()
    union all
    select null, (select id from public.apps where name = 'Micabo' limit 1) where public.is_staff() and not exists (select 1 from public.posters where id = auth.uid())
  ),
  authors as (
    select v.platform, v.author_handle, max(v.views) views, bool_or(split_part(v.language, '-', 1) = split_part(me.language, '-', 1)) same_lang
    from public.videos v cross join me
    where v.platform in ('tiktok', 'instagram') and not coalesce(v.is_ad, false) and v.author_handle is not null
      and v.author_handle !~ '^[0-9]+$'
      and v.competitor_id is null                                   -- pas les comptes de marques concurrentes
      and v.author_handle !~* '(app|\.ai|ai$|official|gemini|chatgpt)'
      and (v.app_scores -> me.app_id::text ->> 'compatible')::boolean
    group by v.platform, v.author_handle
  ),
  ranked as (
    select *, row_number() over (partition by platform order by same_lang desc nulls last, views desc nulls last) rk from authors
  )
  select platform, author_handle,  views,
    case platform when 'tiktok' then 'https://www.tiktok.com/@' || author_handle else 'https://www.instagram.com/' || author_handle || '/' end
  from ranked where rk <= least(greatest(p_limit, 5), 30) order by platform, rk;
$$;

revoke execute on function public.poster_warmup_start(), public.poster_warmup_save(jsonb, text), public.poster_warmup_validate(),
  public.admin_set_warmup(uuid, text), public.poster_warmup_accounts(int) from public, anon;
grant execute on function public.poster_warmup_start(), public.poster_warmup_save(jsonb, text), public.poster_warmup_validate(),
  public.admin_set_warmup(uuid, text), public.poster_warmup_accounts(int) to authenticated;

-- Captures du fil « Pour toi » : bucket privé, chaque posteur dans son dossier ; lecture staff.
insert into storage.buckets (id, name, public) values ('warmup-proofs', 'warmup-proofs', false) on conflict (id) do nothing;
drop policy if exists warmup_proofs_insert on storage.objects;
create policy warmup_proofs_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'warmup-proofs' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists warmup_proofs_read on storage.objects;
create policy warmup_proofs_read on storage.objects for select to authenticated
  using (bucket_id = 'warmup-proofs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));
