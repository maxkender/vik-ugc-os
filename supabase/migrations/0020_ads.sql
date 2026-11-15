-- V3 « Les pubs » : variantes, plateformes de diffusion, identifiant de regroupement Ad Library.
alter table public.videos add column if not exists ad_variants int;
alter table public.videos add column if not exists ad_collation_id text;
alter table public.videos add column if not exists ad_platforms text[];
create index if not exists videos_ad_variants_idx on public.videos (ad_variants desc nulls last, id desc) where is_ad;
create index if not exists videos_ad_started_idx on public.videos (ad_started_at desc nulls last, id desc) where is_ad;
