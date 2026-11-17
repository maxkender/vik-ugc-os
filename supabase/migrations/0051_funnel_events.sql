-- Funnel first-party (17/11) : view_join → start_apply → submit_apply, par pays et utm_content (= ad set ou pub Meta).
-- Sans cookie, sans identifiant, sans donnée personnelle (ni IP, ni user agent) : pas de consentement nécessaire.
-- Complète Meta, qui ne voit les visites qu'après acceptation des cookies.
create table if not exists public.funnel_events (
  id bigserial primary key,
  event text not null check (event in ('view_join', 'start_apply', 'submit_apply')),
  country text,
  lang text,
  utm_source text,
  utm_campaign text,
  utm_content text,
  created_at timestamptz not null default now()
);
create index if not exists funnel_events_at on public.funnel_events (created_at desc);
alter table public.funnel_events enable row level security;
drop policy if exists funnel_events_staff on public.funnel_events;
create policy funnel_events_staff on public.funnel_events for select to authenticated using (public.is_staff());

create or replace function public.track_funnel(p_event text, p_country text default null, p_lang text default null,
  p_utm_source text default null, p_utm_campaign text default null, p_utm_content text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_event not in ('view_join', 'start_apply', 'submit_apply') then return; end if;
  insert into public.funnel_events (event, country, lang, utm_source, utm_campaign, utm_content)
  values (p_event,
    case when upper(coalesce(p_country, '')) ~ '^[A-Z]{2}$' then upper(p_country) end,
    left(nullif(p_lang, ''), 10), left(nullif(p_utm_source, ''), 60), left(nullif(p_utm_campaign, ''), 120), left(nullif(p_utm_content, ''), 120));
end $$;
revoke execute on function public.track_funnel(text, text, text, text, text, text) from public;
grant execute on function public.track_funnel(text, text, text, text, text, text) to anon, authenticated;

-- Agrégat pour l'admin (staff) : par jour, pays, utm_content.
create or replace function public.funnel_summary(p_days int default 7)
returns table (country text, utm_content text, views bigint, starts bigint, submits bigint)
language sql stable security definer set search_path = public as $$
  select country, utm_content,
    count(*) filter (where event = 'view_join'), count(*) filter (where event = 'start_apply'), count(*) filter (where event = 'submit_apply')
  from public.funnel_events
  where public.is_staff() and created_at >= now() - make_interval(days => least(greatest(p_days, 1), 90))
  group by 1, 2 order by 3 desc;
$$;
revoke execute on function public.funnel_summary(int) from public, anon;
grant execute on function public.funnel_summary(int) to authenticated;
