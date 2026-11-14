-- Explorateur : filtre par collection.
drop function if exists public.explore_videos(uuid, uuid, public.platform, text, text, uuid, timestamptz, bigint, numeric, boolean, text, int, text, text, numeric, uuid, int);
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
  p_ads text default 'all',              -- all | organic | ads
  p_min_ad_days int default null,
  p_query text default null,
  p_sort text default 'score',           -- score | views | date | ad_days | recent
  p_cursor_value numeric default null,   -- valeur de tri de la dernière ligne
  p_cursor_id uuid default null,
  p_limit int default 48,
  p_collection uuid default null
) returns setof public.videos
language plpgsql stable security invoker set search_path = public as $$
declare
  v_tsq tsquery;
begin
  if p_query is not null and length(trim(p_query)) > 0 then
    v_tsq := websearch_to_tsquery('simple', p_query);
  end if;
  return query
  select v.* from public.videos v
  where (p_app is null or v.app_id = p_app)
    and (p_competitor is null or v.competitor_id = p_competitor)
    and (p_platform is null or v.platform = p_platform)
    and (p_language is null or v.language = p_language)
    and (p_country is null or v.country = p_country or p_country = any(coalesce(v.ad_countries, '{}')))
    and (p_category is null or v.category_id = p_category)
    and (p_since is null or v.published_at >= p_since)
    and (p_min_views is null or v.views >= p_min_views)
    and (p_min_score is null or v.score >= p_min_score)
    and (not p_favorites or exists (select 1 from public.favorites f where f.video_id = v.id and f.user_id = auth.uid()))
    and (p_ads = 'all' or (p_ads = 'ads' and v.is_ad) or (p_ads = 'organic' and not v.is_ad))
    and (p_min_ad_days is null or v.ad_days >= p_min_ad_days)
    and (p_collection is null or exists (select 1 from public.collection_videos cv where cv.video_id = v.id and cv.collection_id = p_collection))
    and (v_tsq is null or v.search @@ v_tsq or v.author_handle ilike '%' || trim(p_query) || '%')
    and (
      p_cursor_id is null or
      case p_sort
        when 'views' then (coalesce(v.views, -1), v.id) < (p_cursor_value, p_cursor_id)
        when 'date' then (coalesce(extract(epoch from v.published_at), -1), v.id) < (p_cursor_value, p_cursor_id)
        when 'ad_days' then (coalesce(v.ad_days, -1), v.id) < (p_cursor_value::int, p_cursor_id)
        when 'recent' then (extract(epoch from v.first_seen_at), v.id) < (p_cursor_value, p_cursor_id)
        else (v.score, v.id) < (p_cursor_value, p_cursor_id)
      end
    )
  order by
    case when p_sort = 'views' then coalesce(v.views, -1) end desc,
    case when p_sort = 'date' then coalesce(extract(epoch from v.published_at), -1) end desc,
    case when p_sort = 'ad_days' then coalesce(v.ad_days, -1) end desc,
    case when p_sort = 'recent' then extract(epoch from v.first_seen_at) end desc,
    case when p_sort not in ('views','date','ad_days','recent') then v.score end desc,
    v.id desc
  limit least(greatest(p_limit, 1), 200);
end $$;
grant execute on function public.explore_videos to authenticated;
