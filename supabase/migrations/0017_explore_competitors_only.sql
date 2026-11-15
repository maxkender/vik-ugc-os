-- Bibliothèque : filtre « Concurrents uniquement » (par défaut côté interface). Retour du 15/11.
drop function if exists public.explore_videos(uuid, uuid, public.platform, text, text, uuid, timestamptz, bigint, numeric, boolean, text, int, text, text, numeric, uuid, int, uuid, text, int, boolean, text);
drop function if exists public.explore_count(uuid, uuid, public.platform, text, text, uuid, timestamptz, bigint, numeric, text, int, text, text, text);
create or replace function public.explore_videos(
  p_app uuid default null,
  p_competitor uuid default null,
  p_platform public.platform default null,
  p_language text default null,
  p_country text default null,
  p_category uuid default null,
  p_since timestamptz default null,
  p_min_views bigint default null,
  p_min_score numeric default null,
  p_favorites boolean default false,
  p_ads text default 'all',
  p_min_ad_days int default null,
  p_query text default null,
  p_sort text default 'score',          -- score | views | likes | shares | engagement | outlier | velocity | date | recent | ad_days
  p_cursor_value numeric default null,
  p_cursor_id uuid default null,
  p_limit int default 48,
  p_collection uuid default null,
  p_origin text default null,            -- official | ugc | ad
  p_offset int default null,             -- pagination par page (vue tableau) ; ignore le curseur
  p_asc boolean default false,
  p_author text default null,
  p_with_competitor boolean default false
) returns setof public.videos
language plpgsql stable security invoker set search_path = public as $$
declare v_tsq tsquery;
begin
  if p_query is not null and length(trim(p_query)) > 0 then v_tsq := websearch_to_tsquery('simple', p_query); end if;
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
      and ($13::tsquery is null or v.search @@ $13 or v.author_handle ilike '%%' || trim($14) || '%%')
      and ($15 is null or exists (select 1 from public.collection_videos cv where cv.video_id = v.id and cv.collection_id = $15))
      and ($16 is null or v.origin = $16)
      and ($17 is null or v.author_handle = $17)
      and ($18 is null or %3$s)
      and (not $22 or v.competitor_id is not null)
    order by %1$s %2$s nulls last, v.id %2$s
    limit $19 offset coalesce($20, 0)
  $q$,
    case p_sort when 'views' then 'v.views' when 'likes' then 'v.likes' when 'shares' then 'v.shares'
      when 'engagement' then 'v.engagement' when 'outlier' then 'v.outlier' when 'velocity' then 'v.velocity'
      when 'date' then 'v.published_at' when 'recent' then 'v.first_seen_at' when 'ad_days' then 'v.ad_days' else 'v.score' end,
    case when p_asc then 'asc' else 'desc' end,
    -- curseur (keyset, tri décroissant) ; la valeur nulle est traitée comme -1
    format('(coalesce(%s, -1), v.id) < ($18, $21)',
      case p_sort when 'views' then 'v.views' when 'likes' then 'v.likes' when 'shares' then 'v.shares'
        when 'engagement' then 'v.engagement' when 'outlier' then 'v.outlier' when 'velocity' then 'v.velocity'
        when 'date' then 'extract(epoch from v.published_at)' when 'recent' then 'extract(epoch from v.first_seen_at)'
        when 'ad_days' then 'v.ad_days' else 'v.score' end)
  )
  using p_app, p_competitor, p_platform, p_language, p_country, p_category, p_since, p_min_views, p_min_score,
        p_favorites, p_ads, p_min_ad_days, v_tsq, p_query, p_collection, p_origin, p_author,
        case when p_offset is null and not p_asc then p_cursor_value end,
        least(greatest(p_limit, 1), 500), p_offset, p_cursor_id, p_with_competitor;
end $$;
grant execute on function public.explore_videos to authenticated;

-- Nombre de résultats (vue tableau). Estimation exacte jusqu'à 100 000.
create or replace function public.explore_count(
  p_app uuid default null, p_competitor uuid default null, p_platform public.platform default null, p_language text default null,
  p_country text default null, p_category uuid default null, p_since timestamptz default null, p_min_views bigint default null,
  p_min_score numeric default null, p_ads text default 'all', p_min_ad_days int default null, p_query text default null,
  p_origin text default null, p_author text default null, p_with_competitor boolean default false
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
      and (p_query is null or trim(p_query) = '' or v.search @@ websearch_to_tsquery('simple', p_query) or v.author_handle ilike '%' || trim(p_query) || '%')
      and (p_origin is null or v.origin = p_origin) and (p_author is null or v.author_handle = p_author)
      and (not p_with_competitor or v.competitor_id is not null)
    limit 100000
  ) x
$$;
grant execute on function public.explore_count to authenticated;

