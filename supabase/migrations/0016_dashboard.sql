-- Tableau de bord admin (/admin) : KPI + séries 14 jours, funnel, « À traiter ». Comptes de test exclus.
-- security invoker : chaque rôle ne voit que ce que la RLS lui permet (le spend Meta reste à 0 hors admin).
create or replace function public.dashboard_stats() returns jsonb
language sql stable security invoker set search_path = public as $$
  with days as (
    select generate_series(current_date - 13, current_date, interval '1 day')::date as d
  ),
  test_posters as (
    select p.id from public.posters p join public.profiles pr on pr.id = p.id where pr.is_test
  ),
  vids as (
    select d.d, count(v.id) n, count(v.id) filter (where v.outlier >= 10 and not v.is_ad) outliers
    from days d left join public.videos v on v.first_seen_at::date = d.d group by d.d
  ),
  apps as (
    select d.d, count(a.id) n from days d
    left join public.applications a on a.created_at::date = d.d and a.email not like '%@vik-qa.test' group by d.d
  ),
  posts as (
    select d.d, count(b.id) n from days d
    left join public.brief_assignments b on b.posted_at::date = d.d and b.poster_id not in (select id from test_posters) group by d.d
  ),
  spend as (
    select d.d, coalesce(sum(m.spend), 0) s from days d
    left join public.meta_insights m on m.date = d.d and m.level = 'campaign' group by d.d
  ),
  apify as (
    select d.d, coalesce(sum(r.cost_usd), 0) c from days d
    left join public.agent_runs r on r.started_at::date = d.d group by d.d
  ),
  by_comp as (
    select coalesce(c.name, 'Autres') as name, v.first_seen_at::date as d, count(*) n
    from public.videos v left join public.competitors c on c.id = v.competitor_id
    where v.first_seen_at >= current_date - 13 group by 1, 2
  ),
  active as (
    select count(*) n from public.posters p where p.status = 'active' and p.id not in (select id from test_posters)
  ),
  per_day as (
    select coalesce((select (value->>'per_day')::int from public.settings where key = 'briefs'), 2) n
  )
  select jsonb_build_object(
    'days', (select jsonb_agg(d order by d) from days),
    'videos', (select jsonb_agg(n order by d) from vids),
    'outliers', (select jsonb_agg(outliers order by d) from vids),
    'applications', (select jsonb_agg(n order by d) from apps),
    'posts', (select jsonb_agg(n order by d) from posts),
    'spend', (select jsonb_agg(round(s, 2) order by d) from spend),
    'apify', (select jsonb_agg(round(c, 2) order by d) from apify),
    'by_competitor', (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'd', d, 'n', n)), '[]') from by_comp),
    'totals', jsonb_build_object(
      'videos', (select count(*) from public.videos),
      'ugc', (select count(*) from public.videos where origin = 'ugc'),
      'active_posters', (select n from active),
      'posts_today', (select count(*) from public.brief_assignments where posted_at::date = current_date and poster_id not in (select id from test_posters)),
      'posts_goal', (select n from active) * (select n from per_day)
    ),
    'funnel', jsonb_build_object(
      'applied', (select count(*) from public.applications where email not like '%@vik-qa.test'),
      'accepted', (select count(*) from public.applications where email not like '%@vik-qa.test' and status in ('accepted','contract_sent','signed','active')),
      'signed', (select count(*) from public.applications where email not like '%@vik-qa.test' and status in ('signed','active')),
      'active', (select count(*) from public.applications where email not like '%@vik-qa.test' and status = 'active')
    ),
    'todo', jsonb_build_object(
      'to_review', (select count(*) from public.applications where status in ('new','review') and email not like '%@vik-qa.test'),
      'blocked', (select count(*) from public.applications a where a.email not like '%@vik-qa.test'
                    and ((a.status = 'contract_sent' and a.updated_at < now() - interval '48 hours')
                      or (a.status = 'signed' and a.updated_at < now() - interval '48 hours'))),
      'to_validate', (select count(*) from public.brief_assignments where status = 'posted' and poster_id not in (select id from test_posters))
    )
  )
$$;
grant execute on function public.dashboard_stats() to authenticated;
