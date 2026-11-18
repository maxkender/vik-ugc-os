-- /join allégée (18/11) : clics sur les boutons « Postuler » (hero / collant) et fin de l'étape 1 du formulaire.
alter table public.funnel_events drop constraint if exists funnel_events_event_check;
alter table public.funnel_events add constraint funnel_events_event_check check (event in
  ('view_join', 'click_apply_hero', 'click_apply_sticky', 'start_apply', 'apply_step1_done', 'submit_apply', 'submit_no_video', 'video_added'));
create or replace function public.track_funnel(p_event text, p_country text default null, p_lang text default null,
  p_utm_source text default null, p_utm_campaign text default null, p_utm_content text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_event not in ('view_join', 'click_apply_hero', 'click_apply_sticky', 'start_apply', 'apply_step1_done', 'submit_apply', 'submit_no_video') then return; end if;
  insert into public.funnel_events (event, country, lang, utm_source, utm_campaign, utm_content)
  values (p_event, case when upper(coalesce(p_country, '')) ~ '^[A-Z]{2}$' then upper(p_country) end,
    left(nullif(p_lang, ''), 10), left(nullif(p_utm_source, ''), 60), left(nullif(p_utm_campaign, ''), 120), left(nullif(p_utm_content, ''), 120));
end $$;
drop function if exists public.funnel_summary(int);
create or replace function public.funnel_summary(p_days int default 7)
returns table (country text, utm_content text, views bigint, click_hero bigint, click_sticky bigint, starts bigint, step1 bigint, submits bigint, no_video bigint)
language sql stable security definer set search_path = public as $$
  select country, utm_content,
    count(*) filter (where event = 'view_join'), count(*) filter (where event = 'click_apply_hero'), count(*) filter (where event = 'click_apply_sticky'),
    count(*) filter (where event = 'start_apply'), count(*) filter (where event = 'apply_step1_done'),
    count(*) filter (where event = 'submit_apply'), count(*) filter (where event = 'submit_no_video')
  from public.funnel_events
  where public.is_staff() and created_at >= now() - make_interval(days => least(greatest(p_days, 1), 90))
  group by 1, 2 order by 3 desc;
$$;
revoke execute on function public.funnel_summary(int) from public, anon;
grant execute on function public.funnel_summary(int) to authenticated;

-- Brouillon enregistré à la fin de l'étape 1 (nom, email, pays, 18+, iPhone, consentement) pour pouvoir relancer.
-- Écrit uniquement par la fonction apply (service role) ; lecture staff. Marqué complété à l'envoi de la candidature.
create table if not exists public.application_drafts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text not null,
  country text,
  language text,
  has_iphone boolean,
  utm_source text,
  utm_campaign text,
  utm_content text,
  reminders int not null default 0,
  last_reminded_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists application_drafts_open on public.application_drafts (created_at) where completed_at is null;
alter table public.application_drafts enable row level security;
drop policy if exists application_drafts_staff on public.application_drafts;
create policy application_drafts_staff on public.application_drafts for select to authenticated using (public.is_staff());
