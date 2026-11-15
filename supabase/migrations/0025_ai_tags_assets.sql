-- V4 : catégorie et pertinence par app via LLM (fal), tags libres, bibliothèque d'assets pour les briefs.

-- 1. Apps : cible (pour le score de pertinence).
alter table public.apps add column if not exists audience text;
update public.apps set audience = coalesce(audience,
  'Lycéens et étudiants (15–25 ans) qui révisent des examens et veulent apprendre plus vite avec l''IA : fiches, flashcards, résumés de cours, plans de révision.')
where slug = 'micabo';

-- 2. Vidéos : tags libres + scores par app (dénormalisés pour trier et filtrer dans explore_videos).
--    app_scores = { "<app_id>": { "score": 0-100, "reason": text, "ai_compatible": bool, "manual": bool|null,
--                                 "compatible": bool (manuel sinon IA), "model": text, "at": timestamptz } }
alter table public.videos add column if not exists tags text[] not null default '{}';
alter table public.videos add column if not exists app_scores jsonb not null default '{}';
alter table public.videos add column if not exists ai_scored_at timestamptz;
create index if not exists videos_tags_gin on public.videos using gin (tags);
create index if not exists videos_ai_pending on public.videos (first_seen_at desc) where ai_scored_at is null;

-- Correction manuelle (compatible / pas compatible / null = revenir à l'IA). Réservée au staff (RLS de videos).
create or replace function public.set_app_compat(p_video uuid, p_app uuid, p_compatible boolean)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare cur jsonb; out jsonb;
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  select coalesce(app_scores -> p_app::text, '{}'::jsonb) into cur from public.videos where id = p_video;
  out := cur || jsonb_build_object('manual', p_compatible,
    'compatible', coalesce(p_compatible, (cur ->> 'ai_compatible')::boolean),
    'manual_by', auth.uid(), 'manual_at', now());
  update public.videos set app_scores = jsonb_set(app_scores, array[p_app::text], out, true) where id = p_video;
  return out;
end $$;
grant execute on function public.set_app_compat(uuid, uuid, boolean) to authenticated;

-- 3. Coût des appels LLM (plafond mensuel dans settings.ai).
create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  kind text not null,                 -- classify | assistant
  model text,
  items int not null default 0,
  cost_usd numeric(10,6) not null default 0,
  created_at timestamptz not null default now()
);
alter table public.ai_usage enable row level security;
drop policy if exists ai_usage_staff_read on public.ai_usage;
create policy ai_usage_staff_read on public.ai_usage for select to authenticated using (public.is_staff());

insert into public.settings (key, value) values ('ai', jsonb_build_object(
  'enabled', true, 'model', 'google/gemini-2.5-flash', 'fallback_model', 'anthropic/claude-sonnet-5.5',
  'monthly_cap_usd', 5, 'batch_size', 10, 'per_run', 60))
on conflict (key) do nothing;

-- 4. Bibliothèque d'assets (bucket public : logos, captures, démos, sons, polices destinés aux posteurs).
insert into storage.buckets (id, name, public) values ('brief-assets', 'brief-assets', true) on conflict (id) do nothing;
drop policy if exists brief_assets_staff_write on storage.objects;
create policy brief_assets_staff_write on storage.objects for all to authenticated
  using (bucket_id = 'brief-assets' and public.is_staff()) with check (bucket_id = 'brief-assets' and public.is_staff());

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  app_id uuid references public.apps(id) on delete set null,
  kind text not null check (kind in ('logo','screenshot','demo_video','sound','font','other')),
  name text not null,
  path text not null unique,
  mime text,
  size_bytes bigint,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.brief_assets (
  brief_id uuid not null references public.briefs(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  primary key (brief_id, asset_id)
);
alter table public.assets enable row level security;
alter table public.brief_assets enable row level security;
drop policy if exists assets_staff on public.assets;
create policy assets_staff on public.assets for all to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists assets_poster_read on public.assets;
create policy assets_poster_read on public.assets for select to authenticated using (exists (
  select 1 from public.brief_assets ba join public.brief_assignments b on b.brief_id = ba.brief_id
  where ba.asset_id = assets.id and b.poster_id = auth.uid()));
drop policy if exists brief_assets_staff on public.brief_assets;
create policy brief_assets_staff on public.brief_assets for all to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists brief_assets_poster_read on public.brief_assets;
create policy brief_assets_poster_read on public.brief_assets for select to authenticated using (exists (
  select 1 from public.brief_assignments b where b.brief_id = brief_assets.brief_id and b.poster_id = auth.uid()));

-- 5. Bibliothèque : filtre tag, filtre « compatible avec l'app », tri « pertinence app ».
drop function if exists public.explore_videos(uuid, uuid, public.platform, text, text, uuid, timestamptz, bigint, numeric, boolean, text, int, text, text, numeric, uuid, int, uuid, text, int, boolean, text, boolean);
create or replace function public.explore_videos(
  p_app uuid default null, p_competitor uuid default null, p_platform public.platform default null,
  p_language text default null, p_country text default null, p_category uuid default null,
  p_since timestamptz default null, p_min_views bigint default null, p_min_score numeric default null,
  p_favorites boolean default false, p_ads text default 'all', p_min_ad_days int default null,
  p_query text default null,
  p_sort text default 'score',          -- … | relevance (pertinence pour p_rel_app)
  p_cursor_value numeric default null, p_cursor_id uuid default null, p_limit int default 48,
  p_collection uuid default null, p_origin text default null, p_offset int default null,
  p_asc boolean default false, p_author text default null, p_with_competitor boolean default false,
  p_tag text default null,              -- tag libre
  p_compat_app uuid default null,       -- seulement les vidéos compatibles avec cette app
  p_rel_app uuid default null,          -- app du tri « relevance »
  p_uncategorized boolean default false
) returns setof public.videos
language plpgsql stable security invoker set search_path = public as $$
declare v_tsq tsquery; v_key text; v_rel text;
begin
  if p_query is not null and length(trim(p_query)) > 0 then v_tsq := websearch_to_tsquery('simple', p_query); end if;
  -- Pertinence : -1 si non notée ou marquée « pas compatible » à la main.
  v_rel := format($r$(case when (v.app_scores -> %L ->> 'manual')::boolean is false then -1
                      else coalesce((v.app_scores -> %L ->> 'score')::numeric, -1) end)$r$, p_rel_app::text, p_rel_app::text);
  v_key := case p_sort when 'views' then 'v.views' when 'likes' then 'v.likes' when 'shares' then 'v.shares'
      when 'engagement' then 'v.engagement' when 'outlier' then 'v.outlier' when 'velocity' then 'v.velocity'
      when 'date' then 'extract(epoch from v.published_at)' when 'recent' then 'extract(epoch from v.first_seen_at)'
      when 'ad_days' then 'v.ad_days' when 'relevance' then case when p_rel_app is null then 'v.score' else v_rel end
      else 'v.score' end;
  return query execute format($q$
    select v.* from public.videos v
    where ($1 is null or v.app_id = $1)
      and ($2 is null or v.competitor_id = $2)
      and ($3 is null or v.platform = $3)
      and ($4 is null or v.language = $4)
      and ($5 is null or v.country = $5 or $5 = any(coalesce(v.ad_countries, '{}')))
      and ($6 is null or v.category_id = $6)
      and ($7 is null or v.published_at >= $7)
      and ($8 is null or v.views >= $8)
      and ($9 is null or v.score >= $9)
      and (not $10 or exists (select 1 from public.favorites f where f.video_id = v.id and f.user_id = auth.uid()))
      and ($11 = 'all' or ($11 = 'ads' and v.is_ad) or ($11 = 'organic' and not v.is_ad))
      and ($12 is null or v.ad_days >= $12)
      and ($13::tsquery is null or v.search @@ $13 or v.author_handle ilike '%%' || trim($14) || '%%' or trim($14) = any(v.tags))
      and ($15 is null or exists (select 1 from public.collection_videos cv where cv.video_id = v.id and cv.collection_id = $15))
      and ($16 is null or v.origin = $16)
      and ($17 is null or v.author_handle = $17)
      and ($18 is null or (coalesce(%1$s, -1), v.id) < ($18, $21))
      and (not $22 or v.competitor_id is not null)
      and ($23 is null or $23 = any(v.tags))
      and ($24 is null or (v.app_scores -> $24::text ->> 'compatible')::boolean)
      and (not $25 or v.category_id is null)
    order by %1$s %2$s nulls last, v.id %2$s
    limit $19 offset coalesce($20, 0)
  $q$, v_key, case when p_asc then 'asc' else 'desc' end)
  using p_app, p_competitor, p_platform, p_language, p_country, p_category, p_since, p_min_views, p_min_score,
        p_favorites, p_ads, p_min_ad_days, v_tsq, p_query, p_collection, p_origin, p_author,
        case when p_offset is null and not p_asc then p_cursor_value end,
        least(greatest(p_limit, 1), 500), p_offset, p_cursor_id, p_with_competitor,
        nullif(trim(p_tag), ''), p_compat_app, p_uncategorized;
end $$;
grant execute on function public.explore_videos to authenticated;

drop function if exists public.explore_count(uuid, uuid, public.platform, text, text, uuid, timestamptz, bigint, numeric, text, int, text, text, text, boolean);
create or replace function public.explore_count(
  p_app uuid default null, p_competitor uuid default null, p_platform public.platform default null, p_language text default null,
  p_country text default null, p_category uuid default null, p_since timestamptz default null, p_min_views bigint default null,
  p_min_score numeric default null, p_ads text default 'all', p_min_ad_days int default null, p_query text default null,
  p_origin text default null, p_author text default null, p_with_competitor boolean default false,
  p_tag text default null, p_compat_app uuid default null, p_uncategorized boolean default false
) returns bigint language sql stable security invoker set search_path = public as $$
  select count(*) from (
    select 1 from public.videos v
    where (p_app is null or v.app_id = p_app) and (p_competitor is null or v.competitor_id = p_competitor)
      and (p_platform is null or v.platform = p_platform) and (p_language is null or v.language = p_language)
      and (p_country is null or v.country = p_country or p_country = any(coalesce(v.ad_countries, '{}')))
      and (p_category is null or v.category_id = p_category) and (p_since is null or v.published_at >= p_since)
      and (p_min_views is null or v.views >= p_min_views) and (p_min_score is null or v.score >= p_min_score)
      and (p_ads = 'all' or (p_ads = 'ads' and v.is_ad) or (p_ads = 'organic' and not v.is_ad))
      and (p_min_ad_days is null or v.ad_days >= p_min_ad_days)
      and (p_query is null or trim(p_query) = '' or v.search @@ websearch_to_tsquery('simple', p_query) or v.author_handle ilike '%' || trim(p_query) || '%' or trim(p_query) = any(v.tags))
      and (p_origin is null or v.origin = p_origin) and (p_author is null or v.author_handle = p_author)
      and (not p_with_competitor or v.competitor_id is not null)
      and (nullif(trim(p_tag), '') is null or trim(p_tag) = any(v.tags))
      and (p_compat_app is null or (v.app_scores -> p_compat_app::text ->> 'compatible')::boolean)
      and (not p_uncategorized or v.category_id is null)
    limit 100000
  ) x
$$;
grant execute on function public.explore_count to authenticated;

-- 6. Chaque nouvelle vidéo est classée et notée par l'IA (toutes les 30 min, si FAL_KEY est posée et sous le plafond).
select cron.schedule('vik_ai_classify', '*/30 * * * *', $$select public.call_function('ai', '{"action":"classify_pending"}')$$);
