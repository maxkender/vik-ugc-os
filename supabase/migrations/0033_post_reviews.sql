-- Retours aux créateurs (16/11) : verdict Validé / À corriger / Refusé, commentaire, points cochés, timestamps,
-- modèles réutilisables ; notification in-app + email ; « J'ai corrigé » renvoie un nouveau lien.
alter table public.brief_assignments drop constraint if exists brief_assignments_status_check;
alter table public.brief_assignments add constraint brief_assignments_status_check
  check (status in ('todo','posted','validated','rejected','changes_requested'));

create table if not exists public.post_reviews (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.brief_assignments(id) on delete cascade,
  poster_id uuid not null references public.posters(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete set null,
  verdict text not null check (verdict in ('validated','changes_requested','rejected')),
  comment text,
  checks text[] not null default '{}',      -- hook | pacing | sound | onscreen_text | duration | quality | instructions
  timestamps jsonb not null default '[]',   -- [{ "t": "0:04", "note": "…" }]
  posted_url text,
  seen_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists post_reviews_poster_idx on public.post_reviews (poster_id, created_at desc);
create index if not exists post_reviews_assignment_idx on public.post_reviews (assignment_id, created_at desc);

create table if not exists public.review_templates (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  verdict text not null check (verdict in ('validated','changes_requested','rejected')),
  comment text not null,
  checks text[] not null default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.post_reviews enable row level security;
alter table public.review_templates enable row level security;
drop policy if exists post_reviews_staff on public.post_reviews;
create policy post_reviews_staff on public.post_reviews for all to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists post_reviews_poster_read on public.post_reviews;
create policy post_reviews_poster_read on public.post_reviews for select to authenticated using (poster_id = auth.uid());
drop policy if exists review_templates_staff on public.review_templates;
create policy review_templates_staff on public.review_templates for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Le posteur marque ses retours comme lus.
create or replace function public.mark_reviews_seen() returns int
language sql security definer set search_path = public as $$
  with u as (update public.post_reviews set seen_at = now() where poster_id = auth.uid() and seen_at is null returning 1)
  select count(*)::int from u
$$;
revoke execute on function public.mark_reviews_seen() from anon;
grant execute on function public.mark_reviews_seen() to authenticated;

-- Soumission d'un lien : « J'ai corrigé » (à corriger / refusé) repart en « posté » avec un nouveau lien,
-- nouvelle date de publication et vues remises à zéro (le J+7 compte depuis la nouvelle vidéo).
create or replace function public.submit_post(p_assignment uuid, p_url text) returns public.brief_assignments
language plpgsql security definer set search_path = public as $$
declare r public.brief_assignments; v_platform text; v_prev text;
begin
  if p_url !~* '^https?://' then raise exception 'invalid url'; end if;
  v_platform := case when p_url ~* 'tiktok\.com' then 'tiktok' when p_url ~* 'instagram\.com' then 'instagram' else 'other' end;
  select status into v_prev from public.brief_assignments where id = p_assignment and poster_id = auth.uid();
  if v_prev is null then raise exception 'assignment not found'; end if;
  if v_prev = 'validated' then raise exception 'already validated'; end if;
  update public.brief_assignments
     set posted_url = trim(p_url), posted_platform = v_platform,
         posted_at = case when v_prev in ('changes_requested','rejected') then now() else coalesce(posted_at, now()) end,
         views_d2 = case when v_prev in ('changes_requested','rejected') then null else views_d2 end,
         views_d7 = case when v_prev in ('changes_requested','rejected') then null else views_d7 end,
         views_d2_at = case when v_prev in ('changes_requested','rejected') then null else views_d2_at end,
         views_d7_at = case when v_prev in ('changes_requested','rejected') then null else views_d7_at end,
         rejection_reason = null,
         status = case when status in ('todo','rejected','changes_requested') then 'posted' else status end
   where id = p_assignment and poster_id = auth.uid()
   returning * into r;
  return r;
end $$;
revoke execute on function public.submit_post(uuid, text) from anon;
grant execute on function public.submit_post(uuid, text) to authenticated;

-- Email « retour sur ta vidéo » (dans la langue du posteur ; repli anglais).
insert into public.email_templates (key, language, subject, body, button_label) values
('post_feedback','en','Feedback on your video: {verdict}',
 'Hi {first_name},

We reviewed your video for the brief "{brief_title}": {verdict}.

{comment}

{points}

Open your creator space to see all the details{fix_hint}.', 'See the feedback'),
('post_feedback','fr','Retour sur ta vidéo : {verdict}',
 'Salut {first_name},

On a regardé ta vidéo pour le brief « {brief_title} » : {verdict}.

{comment}

{points}

Ouvre ton espace créateur pour voir tous les détails{fix_hint}.', 'Voir le retour'),
('post_feedback','es','Comentarios sobre tu video: {verdict}',
 'Hola {first_name}:

Revisamos tu video del brief «{brief_title}»: {verdict}.

{comment}

{points}

Abre tu espacio de creador para ver todos los detalles{fix_hint}.', 'Ver los comentarios')
on conflict (key, language) do update set subject = excluded.subject, body = excluded.body, button_label = excluded.button_label;

-- Modèles de retours de départ.
insert into public.review_templates (label, verdict, comment, checks)
select * from (values
  ('Hook trop lent', 'changes_requested', 'Le hook doit arriver dans la première seconde : commence directement par la phrase du brief, sans intro.', array['hook']),
  ('Son / voix', 'changes_requested', 'On entend mal ta voix : filme dans un endroit calme, téléphone plus proche, sans musique trop forte par-dessus.', array['sound']),
  ('Texte à l''écran', 'changes_requested', 'Ajoute le texte du hook à l''écran pendant les 3 premières secondes, en gros et lisible.', array['onscreen_text']),
  ('Consignes non suivies', 'changes_requested', 'La vidéo ne suit pas le brief : reprends la vidéo de référence et les consignes, puis renvoie un nouveau lien.', array['instructions']),
  ('Top, validé', 'validated', 'Super vidéo : hook clair, bon rythme. Continue comme ça !', array[]::text[])
) v(label, verdict, comment, checks)
where not exists (select 1 from public.review_templates);
