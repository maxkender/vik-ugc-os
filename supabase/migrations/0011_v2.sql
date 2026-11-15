-- V2 (15/11) : rôle Contrôleur, métriques de performance, attribution concurrents (officiel / UGC / pub),
-- budget Apify quotidien, suivi d'onboarding (événements, ouvertures, clics), handles TikTok/IG, budgets Meta.
-- Pré-requis : alter type public.user_role add value 'controller' (exécuté à part, hors transaction).

-- ───────────── Rôles ─────────────
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','recruiter','controller'))
$$;
create or replace function public.is_controller() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','controller'))
$$;
create or replace function public.is_recruiter_or_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','recruiter'))
$$;
revoke execute on function public.is_controller(), public.is_recruiter_or_admin() from public, anon;
grant execute on function public.is_controller(), public.is_recruiter_or_admin() to authenticated;

-- Tables sensibles : plus lisibles par le contrôleur ni le recruteur (paie, réglages, emails, Meta, journal).
do $$
declare t text;
begin
  foreach t in array array['payouts','settings','email_outbox','email_templates','meta_campaigns','meta_adsets','meta_ads',
                           'meta_insights','recruitment_creatives','audit_log','contract_templates','paid_ad_candidates'] loop
    execute format('drop policy if exists %I on public.%I', t || '_staff_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_admin())', t || '_staff_read', t);
  end loop;
end $$;
-- Candidatures / contrats : recruteur (ses pays) et admin, pas le contrôleur.
create or replace function public.can_see_country(p_country text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid()
       and (role = 'admin' or (role = 'recruiter' and p_country = any(recruiter_countries)))
  )
$$;
-- Contrôleur : valide/refuse les posts et corrige les vues ; active/archive les briefs.
drop policy if exists assignments_controller on public.brief_assignments;
create policy assignments_controller on public.brief_assignments for update to authenticated using (public.is_controller()) with check (public.is_controller());
drop policy if exists briefs_controller on public.briefs;
create policy briefs_controller on public.briefs for update to authenticated using (public.is_controller()) with check (public.is_controller());

-- ───────────── Concurrents : attribution officiel / UGC ─────────────
alter table public.competitors add column if not exists brand_terms text[] not null default '{}';     -- mots / hashtags / @ qui signalent la marque
alter table public.competitors add column if not exists official_handles text[] not null default '{}'; -- comptes officiels (toutes plateformes)
alter table public.competitors add column if not exists discovered boolean not null default false;     -- ajouté par la découverte, à valider

alter table public.videos add column if not exists mentions text[] not null default '{}';
alter table public.videos add column if not exists origin text;            -- official | ugc | ad | other
alter table public.videos add column if not exists engagement numeric;     -- (likes + 2·com + 3·partages) / vues
alter table public.videos add column if not exists outlier numeric;        -- vues / max(abonnés, 500)
alter table public.videos add column if not exists velocity numeric;       -- vues / jour depuis la publication
create index if not exists videos_likes_idx on public.videos (likes desc nulls last, id desc);
create index if not exists videos_shares_idx on public.videos (shares desc nulls last, id desc);
create index if not exists videos_engagement_idx on public.videos (engagement desc nulls last, id desc);
create index if not exists videos_outlier_idx on public.videos (outlier desc nulls last, id desc);
create index if not exists videos_velocity_idx on public.videos (velocity desc nulls last, id desc);
create index if not exists videos_origin_idx on public.videos (origin);
create index if not exists videos_author_idx on public.videos (author_handle);

update public.competitors c set
  brand_terms = v.terms, official_handles = v.handles
from (values
  ('Knowunity', array['knowunity'], array['knowunity','knowunity.fr','knowunity.de','knowunity.es','knowunity.uk','knowunity.pl','knowunity.it','knowunityapp']),
  ('Astra AI', array['astra ai','astraai','astra_ai','astra-ai'], array['astra_ai_official','astra_ai_es','astra_ai_de']),
  ('Gizmo', array['gizmo ai','gizmoai','gizmo.ai','gizmo app','gizmoapp'], array['gizmo.ai']),
  ('Flashka', array['flashka','flashka ai','flashkaai'], array['flashka_ai','flashka.ai','flashka_study']),
  ('Diane', array['diane app','dianeapp','diane.app','diane ai','dianeai'], array['diane.app.officiel','fr.diane.app']),
  ('Studyflash', array['studyflash'], array[]::text[]),
  ('Quizlet', array['quizlet'], array['quizlet'])
) as v(name, terms, handles)
where c.name = v.name and c.brand_terms = '{}';

-- Métriques calculées (aussi recalculées par collect.rescore).
update public.videos set
  engagement = case when coalesce(views,0) > 0 then round(((coalesce(likes,0) + 2*coalesce(comments,0) + 3*coalesce(shares,0))::numeric / views), 4) end,
  outlier = case when views is not null then round(views::numeric / greatest(coalesce(author_followers,0), 500), 2) end,
  velocity = case when views is not null and published_at is not null then round(views::numeric / greatest(extract(epoch from now() - published_at) / 86400, 1), 1) end,
  origin = coalesce(origin, case when is_ad then 'ad' else null end);

-- ───────────── Explorateur v2 : tris étendus, multi-concurrents, origine, pagination (grille ou tableau) ─────────────
drop function if exists public.explore_videos(uuid, uuid, public.platform, text, text, uuid, timestamptz, bigint, numeric, boolean, text, int, text, text, numeric, uuid, int, uuid);
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
  p_author text default null
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
        least(greatest(p_limit, 1), 500), p_offset, p_cursor_id;
end $$;
grant execute on function public.explore_videos to authenticated;

-- Nombre de résultats (vue tableau). Estimation exacte jusqu'à 100 000.
create or replace function public.explore_count(
  p_app uuid default null, p_competitor uuid default null, p_platform public.platform default null, p_language text default null,
  p_country text default null, p_category uuid default null, p_since timestamptz default null, p_min_views bigint default null,
  p_min_score numeric default null, p_ads text default 'all', p_min_ad_days int default null, p_query text default null,
  p_origin text default null, p_author text default null
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
    limit 100000
  ) x
$$;
grant execute on function public.explore_count to authenticated;

-- Classement des concurrents.
create or replace function public.competitor_stats() returns table (
  competitor_id uuid, name text, videos bigint, organic bigint, ugc bigint, ads bigint, total_views numeric, avg_views numeric,
  median_outlier numeric, best_score numeric, active_ads bigint, longest_ad_days int, creators bigint
) language sql stable security invoker set search_path = public as $$
  select c.id, c.name,
         count(v.id), count(v.id) filter (where not v.is_ad), count(v.id) filter (where v.origin = 'ugc'),
         count(v.id) filter (where v.is_ad), coalesce(sum(v.views), 0), round(avg(v.views) filter (where not v.is_ad)),
         percentile_cont(0.5) within group (order by v.outlier) filter (where v.outlier is not null),
         max(v.score), count(v.id) filter (where v.is_ad and v.ad_active), max(v.ad_days),
         count(distinct v.author_handle) filter (where v.origin = 'ugc')
  from public.competitors c left join public.videos v on v.competitor_id = c.id
  group by c.id, c.name
$$;
grant execute on function public.competitor_stats to authenticated;

-- Meilleurs créateurs UGC d'un concurrent.
create or replace function public.competitor_creators(p_competitor uuid, p_limit int default 20) returns table (
  author_handle text, platform public.platform, videos bigint, total_views numeric, best_views bigint, followers bigint, avg_outlier numeric
) language sql stable security invoker set search_path = public as $$
  select v.author_handle, v.platform, count(*), coalesce(sum(v.views),0), max(v.views), max(v.author_followers), round(avg(v.outlier), 1)
  from public.videos v where v.competitor_id = p_competitor and not v.is_ad and v.author_handle is not null
  group by v.author_handle, v.platform order by sum(v.views) desc nulls last limit p_limit
$$;
grant execute on function public.competitor_creators to authenticated;

-- Formats qui marchent par concurrent.
create or replace function public.competitor_formats(p_competitor uuid) returns table (category_id uuid, name text, videos bigint, avg_views numeric, avg_score numeric)
language sql stable security invoker set search_path = public as $$
  select v.category_id, coalesce(c.name, 'Non classé'), count(*), round(avg(v.views)), round(avg(v.score), 1)
  from public.videos v left join public.categories c on c.id = v.category_id
  where v.competitor_id = p_competitor and not v.is_ad group by 1, 2 order by 4 desc nulls last
$$;
grant execute on function public.competitor_formats to authenticated;

-- ───────────── Apify : budget quotidien + backfill ─────────────
update public.settings set value = value || jsonb_build_object('daily_budget_usd', 30, 'backfill_budget_usd', 50, 'hard_cap_per_run', 200)
 where key = 'apify' and not (value ? 'daily_budget_usd');

-- ───────────── Onboarding : événements, ouvertures, clics ─────────────
create table if not exists public.onboarding_events (
  id bigserial primary key,
  application_id uuid references public.applications(id) on delete cascade,
  poster_id uuid references public.posters(id) on delete cascade,
  step text not null,       -- applied | accepted | contract_email_sent | email_opened | link_clicked | signed | access_sent | first_login | handles_submitted | handles_ok | ruul_connected | first_post | reminder
  at timestamptz not null default now(),
  meta jsonb
);
create index if not exists onboarding_events_app_idx on public.onboarding_events (application_id, at);
alter table public.onboarding_events enable row level security;
drop policy if exists onboarding_events_read on public.onboarding_events;
create policy onboarding_events_read on public.onboarding_events for select to authenticated using (public.is_recruiter_or_admin());

alter table public.email_outbox add column if not exists opened_at timestamptz;
alter table public.email_outbox add column if not exists clicked_at timestamptz;
alter table public.email_outbox add column if not exists open_count int not null default 0;
alter table public.email_outbox add column if not exists click_count int not null default 0;
alter table public.email_outbox add column if not exists application_id uuid references public.applications(id) on delete set null;
create index if not exists email_outbox_app_idx on public.email_outbox (application_id, created_at);

-- Premier login (auth.users n'est pas exposé) : fonction réservée au staff recruteur/admin.
create or replace function public.posters_last_sign_in() returns table (poster_id uuid, last_sign_in_at timestamptz)
language sql stable security definer set search_path = public, auth as $$
  select u.id, u.last_sign_in_at from auth.users u join public.posters p on p.id = u.id
  where public.is_recruiter_or_admin()
$$;
revoke execute on function public.posters_last_sign_in() from public, anon;
grant execute on function public.posters_last_sign_in() to authenticated;

-- ───────────── Handles TikTok / Instagram ─────────────
alter table public.apps add column if not exists handle_patterns text[] not null default array['{app}.{first}', '{first}.studies', '{first}{app}', '{first}.{last1}.{app}'];
alter table public.apps add column if not exists bio_templates jsonb not null default '{}';
alter table public.apps add column if not exists display_name_pattern text not null default '{First} | {App}';
alter table public.apps add column if not exists link_in_bio text;
alter table public.apps add column if not exists profile_photo_tips text;
update public.apps set
  bio_templates = jsonb_build_object(
    'en', 'Micabo ambassador 📚 Study smarter with AI ✨ Link below 👇',
    'fr', 'Ambassadeur·rice Micabo 📚 Révise mieux avec l''IA ✨ Lien ci-dessous 👇',
    'es', 'Embajador/a de Micabo 📚 Estudia mejor con IA ✨ Enlace abajo 👇',
    'de', 'Micabo-Botschafter:in 📚 Smarter lernen mit KI ✨ Link unten 👇',
    'it', 'Ambassador Micabo 📚 Studia meglio con l''IA ✨ Link qui sotto 👇',
    'pt', 'Embaixador(a) Micabo 📚 Estude melhor com IA ✨ Link abaixo 👇'),
  link_in_bio = coalesce(link_in_bio, ios_url),
  profile_photo_tips = coalesce(profile_photo_tips, 'Your own face, well lit, smiling, plain background. No logo, no app screenshot.')
where slug = 'micabo' and bio_templates = '{}';

alter table public.posters add column if not exists app_id uuid references public.apps(id) on delete set null;
alter table public.posters add column if not exists handle_suggestions jsonb not null default '[]';
alter table public.posters add column if not exists handles_status text not null default 'none'
  check (handles_status in ('none','proposed','submitted','verified','failed'));
alter table public.posters add column if not exists handles_checked_at timestamptz;
alter table public.posters add column if not exists handles_report jsonb;
update public.posters set app_id = (select id from public.apps where slug = 'micabo') where app_id is null;

-- Le posteur enregistre ses handles (et passe en « submitted »).
create or replace function public.poster_submit_handles(p_tiktok text, p_instagram text) returns public.posters
language plpgsql security definer set search_path = public as $$
declare r public.posters;
begin
  update public.posters set
    tiktok_handle = nullif(lower(regexp_replace(trim(coalesce(p_tiktok, '')), '^@', '')), ''),
    instagram_handle = nullif(lower(regexp_replace(trim(coalesce(p_instagram, '')), '^@', '')), ''),
    handles_status = 'submitted'
  where id = auth.uid() returning * into r;
  if r.id is null then raise exception 'not a poster'; end if;
  insert into public.onboarding_events (application_id, poster_id, step, meta)
    values (r.application_id, r.id, 'handles_submitted', jsonb_build_object('tiktok', r.tiktok_handle, 'instagram', r.instagram_handle));
  return r;
end $$;
revoke execute on function public.poster_submit_handles(text, text) from public, anon;
grant execute on function public.poster_submit_handles(text, text) to authenticated;

-- Événements automatiques : signature, Ruul « It's done », premier post.
create or replace function public.onboarding_from_poster() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.ruul_status = 'done' and old.ruul_status is distinct from 'done' then
    insert into public.onboarding_events (application_id, poster_id, step) values (new.application_id, new.id, 'ruul_connected');
  end if;
  if new.handles_status = 'verified' and old.handles_status is distinct from 'verified' then
    insert into public.onboarding_events (application_id, poster_id, step) values (new.application_id, new.id, 'handles_ok');
  end if;
  return new;
end $$;
drop trigger if exists posters_onboarding on public.posters;
create trigger posters_onboarding after update on public.posters for each row execute function public.onboarding_from_poster();

create or replace function public.onboarding_from_application() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.onboarding_events (application_id, step) values (new.id, 'applied');
  elsif new.status is distinct from old.status and new.status in ('accepted','signed','rejected','active') then
    insert into public.onboarding_events (application_id, poster_id, step)
      values (new.id, new.poster_id, case new.status when 'active' then 'first_post' else new.status::text end);
  end if;
  return new;
end $$;
drop trigger if exists applications_onboarding on public.applications;
create trigger applications_onboarding after insert or update of status on public.applications for each row execute function public.onboarding_from_application();
revoke execute on function public.onboarding_from_poster(), public.onboarding_from_application() from public, anon, authenticated;

-- Rattrapage des événements pour les candidatures existantes.
insert into public.onboarding_events (application_id, poster_id, step, at)
select a.id, null, 'applied', a.created_at from public.applications a
where not exists (select 1 from public.onboarding_events e where e.application_id = a.id and e.step = 'applied');
insert into public.onboarding_events (application_id, poster_id, step, at)
select c.application_id, a.poster_id, 'signed', c.signed_at from public.contracts c join public.applications a on a.id = c.application_id
where c.signed_at is not null and not exists (select 1 from public.onboarding_events e where e.application_id = c.application_id and e.step = 'signed');

-- ───────────── Meta : budget global visible ─────────────
update public.settings set value = value || jsonb_build_object('global_daily_cap', 100) where key = 'meta' and not (value ? 'global_daily_cap');
