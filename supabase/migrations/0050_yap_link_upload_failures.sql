-- 17/11 : un candidat iPhone n'a pas pu envoyer sa vidéo de présentation (116 Mo, .MOV, type MIME vide).
-- Cause racine (corrigée par la session principale) : limite globale de Storage à 50 Mo, passée à 500 Mo.
-- Ici : vidéo par lien en secours, journal des échecs d'upload, types MIME iOS acceptés par le bucket.
alter table public.applications add column if not exists yap_video_url text;
alter table public.applications alter column yap_video_path drop not null;

update storage.buckets set allowed_mime_types = array['video/mp4','video/quicktime','video/webm','video/x-m4v','video/hevc','video/x-quicktime'],
  file_size_limit = 209715200 where id = 'yap-videos';

create table if not exists public.upload_failures (
  id bigserial primary key,
  context text not null default 'yap',
  file_size bigint,
  mime text,
  file_ext text,
  error text,
  user_agent text,
  country text,
  created_at timestamptz not null default now()
);
alter table public.upload_failures enable row level security;
drop policy if exists upload_failures_staff on public.upload_failures;
create policy upload_failures_staff on public.upload_failures for select to authenticated using (public.is_staff());
