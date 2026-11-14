-- Vik UGC OS — schéma de base.
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- ───────────────────────── Rôles / profils ─────────────────────────
do $$ begin
  create type public.user_role as enum ('admin', 'recruiter', 'poster');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role public.user_role not null default 'poster',
  recruiter_countries text[] not null default '{}',
  locale text not null default 'en',
  created_at timestamptz not null default now()
);

-- Réglages clé/valeur (mode test email, email admin de test, RPM…)
create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ───────────────────────── Apps / concurrents / sources ─────────────────────────
create table if not exists public.apps (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  website text,
  ios_url text,
  android_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.competitors (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade,
  name text not null,
  website text,
  notes text,
  verified boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (app_id, name)
);

do $$ begin
  create type public.platform as enum ('tiktok', 'instagram', 'facebook_ads');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.source_kind as enum ('account', 'hashtag', 'keyword', 'page');
exception when duplicate_object then null; end $$;

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade,
  competitor_id uuid references public.competitors(id) on delete set null,
  platform public.platform not null,
  kind public.source_kind not null,
  value text not null,                     -- @handle, #hashtag, mot-clé, id ou nom de page FB
  languages text[] not null default '{}',
  countries text[] not null default '{}',
  frequency_hours int not null default 24 check (frequency_hours >= 1),
  max_results int not null default 30 check (max_results between 1 and 1000),
  enabled boolean not null default false,  -- désactivé par défaut (coûts)
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz not null default now(),
  unique (app_id, platform, kind, value)
);

do $$ begin
  create type public.run_status as enum ('queued', 'running', 'succeeded', 'failed', 'aborted');
exception when duplicate_object then null; end $$;

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.sources(id) on delete set null,
  app_id uuid references public.apps(id) on delete set null,
  agent text not null,                     -- tiktok | instagram | facebook_ads | views
  trigger text not null default 'manual',  -- manual | cron | adhoc
  params jsonb not null default '{}',
  apify_actor text,
  apify_run_id text,
  apify_dataset_id text,
  status public.run_status not null default 'queued',
  items_found int not null default 0,
  items_new int not null default 0,
  cost_usd numeric(10,4),
  error text,
  created_by uuid references public.profiles(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists agent_runs_status_idx on public.agent_runs (status) where status in ('queued','running');
create index if not exists agent_runs_source_idx on public.agent_runs (source_id, started_at desc);

-- ───────────────────────── Catégories / vidéos ─────────────────────────
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  keywords text[] not null default '{}',   -- heuristique d'auto-catégorisation
  color text,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- array_to_string n'est pas IMMUTABLE : enveloppe pour la colonne générée de recherche.
create or replace function public.immutable_join(arr text[]) returns text
language sql immutable parallel safe as $$ select coalesce(array_to_string(arr, ' '), '') $$;

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  platform public.platform not null,
  external_id text not null,
  url text,
  author_handle text,
  author_name text,
  author_followers bigint,
  caption text,
  language text,
  country text,
  duration_s numeric,
  views bigint,
  likes bigint,
  comments bigint,
  shares bigint,
  published_at timestamptz,
  hashtags text[] not null default '{}',
  sound_name text,
  thumbnail_src text,
  thumbnail_path text,
  video_src text,
  video_path text,
  app_id uuid references public.apps(id) on delete set null,
  competitor_id uuid references public.competitors(id) on delete set null,
  source_id uuid references public.sources(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  category_auto boolean not null default true,
  score numeric not null default 0,
  -- Pubs (Ad Library)
  is_ad boolean not null default false,
  ad_started_at timestamptz,
  ad_ended_at timestamptz,
  ad_active boolean,
  ad_days int,
  ad_page_name text,
  ad_countries text[],
  raw jsonb,
  search tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(author_handle,'') || ' ' || coalesce(author_name,'') || ' ' || coalesce(ad_page_name,'')), 'A') ||
    setweight(to_tsvector('simple', public.immutable_join(hashtags)), 'B') ||
    setweight(to_tsvector('simple', coalesce(caption,'')), 'C')
  ) stored,
  first_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, external_id)
);
create index if not exists videos_score_idx on public.videos (score desc, id desc);
create index if not exists videos_views_idx on public.videos (views desc nulls last, id desc);
create index if not exists videos_published_idx on public.videos (published_at desc nulls last, id desc);
create index if not exists videos_seen_idx on public.videos (first_seen_at desc, id desc);
create index if not exists videos_search_idx on public.videos using gin (search);
create index if not exists videos_hashtags_idx on public.videos using gin (hashtags);
create index if not exists videos_app_idx on public.videos (app_id, score desc);
create index if not exists videos_competitor_idx on public.videos (competitor_id, score desc);
create index if not exists videos_category_idx on public.videos (category_id, score desc);
create index if not exists videos_lang_idx on public.videos (language);
create index if not exists videos_country_idx on public.videos (country);
create index if not exists videos_ads_idx on public.videos (ad_days desc nulls last) where is_ad;

create table if not exists public.video_metrics (
  video_id uuid not null references public.videos(id) on delete cascade,
  captured_at timestamptz not null default now(),
  views bigint, likes bigint, comments bigint, shares bigint,
  primary key (video_id, captured_at)
);

create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);
create index if not exists favorites_video_idx on public.favorites (video_id);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.collection_videos (
  collection_id uuid not null references public.collections(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (collection_id, video_id)
);

-- ───────────────────────── Zones / pays ─────────────────────────
create table if not exists public.zones (
  code text primary key,                   -- A | B | C
  name text not null,
  price_per_video numeric(10,2) not null,
  rpm numeric(10,4) not null,              -- bonus par tranche de rpm_views vues (J+7)
  rpm_views int not null default 1000,     -- 1 000 vues (cf. DECISIONS.md)
  currency text not null default 'USD',
  videos_per_day int not null default 2,
  active boolean not null default true
);

create table if not exists public.countries (
  code text primary key,                   -- ISO 3166-1 alpha-2
  name text not null,
  zone_code text references public.zones(code) on update cascade,
  language text not null default 'en',     -- langue de publication / landing
  open boolean not null default true,      -- recrutement ouvert
  recruiter_id uuid references public.profiles(id) on delete set null
);

-- ───────────────────────── Posteurs / pools ─────────────────────────
create table if not exists public.posters (
  id uuid primary key references public.profiles(id) on delete cascade,
  application_id uuid,
  display_name text not null,
  country text references public.countries(code),
  language text,
  zone_code text references public.zones(code),
  tiktok_handle text,
  instagram_handle text,
  status text not null default 'active' check (status in ('active','paused','offboarded')),
  daily_quota int not null default 2,
  -- Ruul
  ruul_email text,
  ruul_status text not null default 'none' check (ruul_status in ('none','email_given','added','done','stopped')),
  ruul_added_at timestamptz,
  ruul_reminders int not null default 0,
  ruul_last_reminder_at timestamptz,
  ruul_done_at timestamptz,
  started_at date,
  created_at timestamptz not null default now()
);

create table if not exists public.pools (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);
create table if not exists public.pool_members (
  pool_id uuid not null references public.pools(id) on delete cascade,
  poster_id uuid not null references public.posters(id) on delete cascade,
  primary key (pool_id, poster_id)
);

-- ───────────────────────── Briefs ─────────────────────────
create table if not exists public.briefs (
  id uuid primary key default gen_random_uuid(),
  app_id uuid references public.apps(id) on delete set null,
  reference_video_id uuid references public.videos(id) on delete set null,
  title text not null,
  instructions text,
  hook text,
  language text,
  target_countries text[] not null default '{}',
  pool_id uuid references public.pools(id) on delete set null,
  quantity int not null default 1,         -- nombre d'exécutions souhaitées (pool)
  origin text not null default 'library' check (origin in ('library','ad','manual')),
  status text not null default 'active' check (status in ('draft','active','archived')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.brief_assignments (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references public.briefs(id) on delete cascade,
  poster_id uuid not null references public.posters(id) on delete cascade,
  due_date date not null,
  status text not null default 'todo' check (status in ('todo','posted','validated','rejected')),
  posted_url text,
  posted_platform text,
  posted_at timestamptz,
  validated_at timestamptz,
  rejection_reason text,
  views_d2 bigint,
  views_d2_at timestamptz,
  views_d7 bigint,
  views_d7_at timestamptz,
  last_views bigint,
  created_at timestamptz not null default now(),
  unique (brief_id, poster_id)
);
create index if not exists brief_assignments_poster_idx on public.brief_assignments (poster_id, due_date desc);
create index if not exists brief_assignments_measure_idx on public.brief_assignments (posted_at) where posted_url is not null;

-- ───────────────────────── Candidatures / contrats ─────────────────────────
do $$ begin
  create type public.application_status as enum ('new','review','accepted','contract_sent','signed','active','rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  status public.application_status not null default 'new',
  first_name text not null,
  last_name text not null,
  birthdate date not null,
  email text not null,
  phone text,
  country text not null references public.countries(code),
  languages text[] not null default '{}',
  ugc_experience text,
  tiktok_url text,
  tiktok_followers int,
  instagram_url text,
  instagram_followers int,
  equipment text,
  availability text,
  motivation text,
  yap_video_path text,
  locale text not null default 'en',
  utm jsonb not null default '{}',
  notes text,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  rejection_email_due_at timestamptz,
  rejection_email_sent_at timestamptz,
  poster_id uuid references public.posters(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists applications_status_idx on public.applications (status, created_at desc);
create index if not exists applications_country_idx on public.applications (country);
create unique index if not exists applications_email_open_idx on public.applications (lower(email)) where status <> 'rejected';

create table if not exists public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  country_code text references public.countries(code), -- null = modèle par défaut
  language text not null default 'en',
  title text not null,
  body_md text not null,
  version int not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  template_id uuid references public.contract_templates(id) on delete set null,
  token text unique not null default encode(gen_random_bytes(24), 'hex'),
  body_rendered text not null,
  doc_hash text not null,                  -- sha256 du texte rendu
  status text not null default 'sent' check (status in ('sent','signed','expired','cancelled')),
  sent_at timestamptz not null default now(),
  reminders int not null default 0,
  last_reminder_at timestamptz,
  expires_at timestamptz not null default now() + interval '7 days',
  signed_at timestamptz,
  signed_name text,
  signed_ip text,
  signed_user_agent text,
  pdf_path text
);
create index if not exists contracts_open_idx on public.contracts (status, sent_at) where status = 'sent';

-- ───────────────────────── Emails ─────────────────────────
create table if not exists public.email_templates (
  key text not null,
  language text not null default 'en',
  subject text not null,
  body text not null,                      -- texte avec {variables}, paragraphes séparés par une ligne vide
  button_label text,
  updated_at timestamptz not null default now(),
  primary key (key, language)
);

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  template_key text,
  to_email text not null,                  -- destinataire réel prévu
  delivered_to text,                       -- destinataire effectif (redirigé en mode test)
  subject text not null,
  html text not null,
  text text,
  status text not null default 'queued' check (status in ('queued','held','sent','failed','cancelled')),
  hold_reason text,
  error text,
  attempts int not null default 0,
  brevo_message_id text,
  send_after timestamptz not null default now(),
  related_type text,
  related_id uuid,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists email_outbox_queue_idx on public.email_outbox (status, send_after) where status = 'queued';

-- ───────────────────────── Meta Ads ─────────────────────────
create table if not exists public.meta_campaigns (
  id uuid primary key default gen_random_uuid(),
  meta_id text unique,
  name text not null,
  objective text not null default 'OUTCOME_LEADS',
  status text not null default 'PAUSED',
  daily_budget_cap numeric(10,2) not null default 20,
  countries text[] not null default '{}',
  landing_url text,
  last_synced_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.meta_adsets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.meta_campaigns(id) on delete cascade,
  meta_id text unique,
  name text not null,
  country text,
  zone_code text,
  daily_budget numeric(10,2) not null default 5,
  age_min int not null default 18,
  age_max int not null default 25,
  targeting jsonb not null default '{}',
  status text not null default 'PAUSED',
  created_at timestamptz not null default now()
);
create table if not exists public.meta_ads (
  id uuid primary key default gen_random_uuid(),
  adset_id uuid not null references public.meta_adsets(id) on delete cascade,
  creative_id uuid,
  meta_id text unique,
  meta_creative_id text,
  name text not null,
  landing_url text,
  status text not null default 'PAUSED',
  created_at timestamptz not null default now()
);
create table if not exists public.meta_insights (
  level text not null check (level in ('campaign','adset','ad')),
  meta_id text not null,
  date date not null,
  country text,
  spend numeric(12,2) not null default 0,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  leads bigint not null default 0,
  cpc numeric(10,4),
  currency text,
  primary key (level, meta_id, date)
);

create table if not exists public.recruitment_creatives (
  id uuid primary key default gen_random_uuid(),
  country text references public.countries(code),
  language text not null,
  format text not null check (format in ('1:1','4:5','9:16')),
  headline text not null,
  subline text,
  cta text,
  background_path text,
  background_provider text,
  image_path text,
  status text not null default 'draft' check (status in ('draft','approved','rejected','sent_to_meta')),
  meta_image_hash text,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Paie ─────────────────────────
create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  poster_id uuid not null references public.posters(id) on delete cascade,
  week_start date not null,                -- lundi
  zone_code text,
  currency text not null default 'USD',
  videos_count int not null default 0,
  base_amount numeric(10,2) not null default 0,
  bonus_amount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  lines jsonb not null default '[]',
  status text not null default 'pending' check (status in ('pending','paid','void')),
  paid_at timestamptz,
  paid_by uuid references public.profiles(id) on delete set null,
  computed_at timestamptz not null default now(),
  unique (poster_id, week_start)
);

-- ───────────────────────── Paid Ads (squelette) ─────────────────────────
create table if not exists public.paid_ad_candidates (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid unique references public.brief_assignments(id) on delete cascade,
  spark_code text,
  status text not null default 'candidate' check (status in ('candidate','spark_ready','meta_prepared','archived')),
  meta_ad_id uuid references public.meta_ads(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Journal ─────────────────────────
create table if not exists public.audit_log (
  id bigserial primary key,
  actor uuid,
  action text not null,
  entity text,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

-- updated_at
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists videos_touch on public.videos;
create trigger videos_touch before update on public.videos for each row execute function public.touch_updated_at();
drop trigger if exists applications_touch on public.applications;
create trigger applications_touch before update on public.applications for each row execute function public.touch_updated_at();
