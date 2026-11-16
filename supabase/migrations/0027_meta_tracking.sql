-- Lancement Meta : Pixel + Conversions API, objectif Leads, checklist de lancement.
update public.settings set value = value || jsonb_build_object(
  'pixel_id', coalesce(value->>'pixel_id', '1755822698850602'),   -- « Sophia Recrutement » (un pixel dédié est recommandé)
  'tracking_enabled', coalesce((value->>'tracking_enabled')::boolean, true),
  'capi_enabled', coalesce((value->>'capi_enabled')::boolean, true),
  'capi_test_code', coalesce(value->>'capi_test_code', ''),        -- code « Tester les événements » (Events Manager)
  'objective', coalesce(value->>'objective', 'leads'),             -- leads | traffic
  'checklist', coalesce(value->'checklist', '{"translations_reviewed": false, "creatives_validated": false, "domain_verified": false}'::jsonb))
where key = 'meta';

-- Attribution de la candidature (consentement, fbclid / _fbc / _fbp, event_id partagé navigateur ↔ serveur).
alter table public.applications add column if not exists attribution jsonb not null default '{}';

-- Journal des envois Conversions API (checklist « CAPI testé », diagnostic).
create table if not exists public.meta_events (
  id bigint generated always as identity primary key,
  event_name text not null,
  event_id text,
  application_id uuid references public.applications(id) on delete set null,
  test_code text,
  ok boolean not null,
  status_code int,
  events_received int,
  error text,
  fbtrace_id text,
  created_at timestamptz not null default now()
);
alter table public.meta_events enable row level security;
drop policy if exists meta_events_admin_read on public.meta_events;
create policy meta_events_admin_read on public.meta_events for select to authenticated using (public.is_admin());

-- Le ciblage 18–25 / étudiants n'est plus stocké (catégorie EMPLOYMENT : 18–65, pas de ciblage détaillé).
update public.meta_adsets set age_min = 18, age_max = 65,
  targeting = targeting - 'intent'
where targeting ? 'intent' or age_max <> 65;
