-- Brief complet (16/11, Max) : chaque brief précise l'angle, le hook (+ 2–3 variantes), la démo de l'app, la légende,
-- les hashtags, l'heure conseillée ; le posteur publie la même vidéo sur TikTok ET Instagram Reels et colle les 2 liens.
alter table public.briefs add column if not exists angle text;
alter table public.briefs add column if not exists hook_variants text[] not null default '{}';
alter table public.briefs add column if not exists caption text;
alter table public.briefs add column if not exists hashtags text;
alter table public.briefs add column if not exists post_time text;
alter table public.briefs add column if not exists demo_notes text;   -- quoi filmer de l'app (enregistrement d'écran, moment clé…)
alter table public.briefs add column if not exists app_access text;   -- accès / compte de test si besoin

alter table public.brief_assignments add column if not exists posted_url_instagram text;

-- Les 2 liens d'un coup (TikTok obligatoire, Instagram Reels obligatoire). posted_url reste le lien TikTok (suivi des vues).
create or replace function public.submit_post_links(p_assignment uuid, p_tiktok text, p_instagram text) returns public.brief_assignments
language plpgsql security definer set search_path = public as $$
declare r public.brief_assignments;
begin
  if coalesce(p_tiktok, '') !~* '^https?://([a-z0-9-]+\.)*tiktok\.com/' then raise exception 'invalid_tiktok_url'; end if;
  if coalesce(p_instagram, '') !~* '^https?://([a-z0-9-]+\.)*instagram\.com/' then raise exception 'invalid_instagram_url'; end if;
  r := public.submit_post(p_assignment, p_tiktok);
  update public.brief_assignments set posted_url_instagram = trim(p_instagram) where id = r.id returning * into r;
  return r;
end $$;
revoke execute on function public.submit_post_links(uuid, text, text) from public, anon;
grant execute on function public.submit_post_links(uuid, text, text) to authenticated;

-- Description courte de l'app (2 lignes) montrée dans chaque brief.
alter table public.apps add column if not exists pitch jsonb not null default '{}';
update public.apps set pitch = jsonb_build_object(
  'en', 'Micabo is an AI study app: import your course (photo, PDF, notes) and it creates flashcards, quizzes and summaries in seconds, so you revise faster.',
  'fr', 'Micabo est une app d''étude avec IA : tu importes ton cours (photo, PDF, notes) et elle crée en quelques secondes des flashcards, des quiz et des résumés, pour réviser plus vite.',
  'es', 'Micabo es una app de estudio con IA: importas tu clase (foto, PDF, apuntes) y en segundos crea flashcards, quizzes y resúmenes, para repasar más rápido.',
  'de', 'Micabo ist eine Lern-App mit KI: Du importierst deinen Kurs (Foto, PDF, Notizen) und sie erstellt in Sekunden Karteikarten, Quiz und Zusammenfassungen, damit du schneller lernst.',
  'it', 'Micabo è un''app di studio con IA: importi la tua lezione (foto, PDF, appunti) e in pochi secondi crea flashcard, quiz e riassunti, per ripassare più in fretta.')
where name = 'Micabo' and pitch = '{}'::jsonb;
