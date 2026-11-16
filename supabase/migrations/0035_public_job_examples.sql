-- Landing « Le job » : 3–4 exemples publics tirés de la bibliothèque, compatibles avec l'app principale (Micabo),
-- une par catégorie (face cam, réaction, POV, tuto…), langue du candidat en priorité. Vignettes du bucket public.
create or replace function public.public_job_examples(p_language text default null, p_limit int default 4)
returns table (id uuid, platform public.platform, url text, external_id text, thumbnail_path text, thumbnail_src text, category text)
language sql stable security definer set search_path = public as $$
  with app as (select id from public.apps where name = 'Micabo' limit 1),
  ranked as (
    select v.id, v.platform, v.url, v.external_id, v.thumbnail_path, v.thumbnail_src, c.name as category,
      row_number() over (partition by coalesce(c.name, '') order by (v.language = p_language) desc nulls last,
        (v.app_scores -> app.id::text ->> 'score')::numeric desc nulls last, v.views desc nulls last) as rk,
      (v.language = p_language) as same_lang, (v.app_scores -> app.id::text ->> 'score')::numeric as s
    from public.videos v cross join app left join public.categories c on c.id = v.category_id
    where (v.app_scores -> app.id::text ->> 'compatible')::boolean
      and v.platform = 'tiktok' and not coalesce(v.is_ad, false) and v.thumbnail_path is not null
  )
  select id, platform, url, external_id, thumbnail_path, thumbnail_src, category from ranked
  where rk = 1 order by same_lang desc nulls last, s desc nulls last limit least(greatest(p_limit, 1), 6);
$$;
revoke all on function public.public_job_examples(text, int) from public;
grant execute on function public.public_job_examples(text, int) to anon, authenticated;
