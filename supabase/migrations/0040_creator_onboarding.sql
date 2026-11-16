-- Onboarding créateur (16/11, Max) : 7 écrans swipables à la 1re connexion du posteur, dans sa langue.
-- Textes éditables (Réglages → Contenus & aperçus → Onboarding créateur) et versionnés comme les emails.
-- {{slack_url}} vient de settings.community.slack_url (vide = bouton masqué).

create table if not exists public.onboarding_screens (
  key text not null,
  language text not null,
  sort int not null,
  title text not null,
  body text not null,
  button_label text,
  updated_at timestamptz not null default now(),
  primary key (key, language)
);
create table if not exists public.onboarding_screen_versions (
  id bigserial primary key,
  key text not null,
  language text not null,
  title text not null,
  body text not null,
  button_label text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);
alter table public.onboarding_screens enable row level security;
alter table public.onboarding_screen_versions enable row level security;
drop policy if exists onboarding_screens_read on public.onboarding_screens;
create policy onboarding_screens_read on public.onboarding_screens for select to authenticated using (true);
drop policy if exists onboarding_screens_admin on public.onboarding_screens;
create policy onboarding_screens_admin on public.onboarding_screens for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists onboarding_screen_versions_admin on public.onboarding_screen_versions;
create policy onboarding_screen_versions_admin on public.onboarding_screen_versions for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.archive_onboarding_screen() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (old.title, old.body, coalesce(old.button_label, '')) is distinct from (new.title, new.body, coalesce(new.button_label, '')) then
    insert into public.onboarding_screen_versions (key, language, title, body, button_label, created_at, created_by)
    values (old.key, old.language, old.title, old.body, old.button_label, old.updated_at, auth.uid());
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists onboarding_screens_archive on public.onboarding_screens;
create trigger onboarding_screens_archive before update on public.onboarding_screens for each row execute function public.archive_onboarding_screen();

alter table public.posters add column if not exists onboarding_seen_at timestamptz;
create or replace function public.poster_onboarding_done() returns void
language sql security definer set search_path = public as $$
  update public.posters set onboarding_seen_at = coalesce(onboarding_seen_at, now()) where id = auth.uid();
$$;
revoke execute on function public.poster_onboarding_done() from public, anon;
grant execute on function public.poster_onboarding_done() to authenticated;

insert into public.settings (key, value) values ('community', '{"slack_url": ""}'::jsonb) on conflict (key) do nothing;

insert into public.onboarding_screens (key, language, sort, title, body, button_label) values
-- Français
('welcome', 'fr', 1, 'Bienvenue chez Vik Studios 👋', 'Vik Studios est un petit studio qui crée des apps mobiles. Pour les faire connaître, on travaille avec des créateur·rice·s UGC : des personnes comme toi qui tournent des vidéos authentiques sur TikTok et Instagram. C''est pour ça que tu es là.', null),
('win_win', 'fr', 2, 'Gagnant-gagnant 🤝', 'On cherche des personnes régulières qui aiment faire des vidéos. Si tu n''es pas prêt·e à publier chaque jour, si tu n''aimes pas tourner des vidéos, ou si les tarifs ne te conviennent pas, merci de ne pas continuer : c''est mieux pour tout le monde, et on ne t''en voudra pas.', null),
('warmup', 'fr', 3, 'D''abord, un compte chauffé 🔥', 'Pour que tes vidéos percent, ton compte doit être « warmed up ». Pendant 1 à 2 jours (24 h minimum), utilise-le comme une vraie personne : scroll, likes et abonnements dans la niche études. Sans ça, le compte risque le shadowban. L''étape « Warm-up » de ton espace te guide pas à pas, et ton premier brief arrive juste après.', null),
('videos', 'fr', 4, 'Faire de bonnes vidéos 🎬', 'Monte tes vidéos idéalement sur CapCut ou Edits. Choisis un bon éclairage (lumière naturelle face à toi) et parle clairement. Reproduis au plus près la vidéo de référence de ton brief ; s''il n''y en a pas, inspire-toi des vidéos du genre que tu vois tous les jours.', null),
('rhythm', 'fr', 5, 'Le rythme 📅', '1 vidéo par jour, publiée sur TikTok et sur Instagram. La régularité compte plus que tout. Chaque jour, on te fournit le brief et tous les assets dont tu as besoin : vidéo de référence, hook, visuels de l''app.', null),
('community', 'fr', 6, 'La communauté 💬', 'Rejoins notre Slack pour poser tes questions, recevoir des conseils et échanger avec les autres créateur·rice·s.', 'Rejoindre le Slack'),
('ruul', 'fr', 7, 'Être payé·e avec Ruul 💸', 'C''est simple : tu crées ton compte Ruul, tu ajoutes ton IBAN et tu fais la vérification d''identité, puis tu reçois tes paiements chaque semaine. Tant que Ruul n''est pas configuré, on ne peut pas te payer.', 'Voir le guide Ruul'),
('start', 'fr', 8, 'C''est parti 🚀', 'Première étape : le warm-up de tes comptes TikTok et Instagram (24 h minimum). Ton premier brief arrive dès qu''il est validé.', 'C''est parti'),
-- English
('welcome', 'en', 1, 'Welcome to Vik Studios 👋', 'Vik Studios is a small studio that builds mobile apps. To get them known, we work with UGC creators: people like you who film authentic videos on TikTok and Instagram. That''s why you''re here.', null),
('win_win', 'en', 2, 'Win-win 🤝', 'We''re looking for consistent people who enjoy making videos. If you''re not ready to post every day, if you don''t like filming videos, or if the rates don''t suit you, please don''t continue: it''s better for everyone, and no hard feelings.', null),
('warmup', 'en', 3, 'First, a warmed-up account 🔥', 'For your videos to take off, your account needs to be warmed up. For 1 to 2 days (24 hours minimum), use it like a real person: scroll, like and follow accounts in the study niche. Without this, the account risks a shadowban. The “Warm-up” step in your space guides you step by step, and your first brief comes right after.', null),
('videos', 'en', 4, 'Making good videos 🎬', 'Edit your videos ideally in CapCut or Edits. Pick good lighting (natural light facing you) and speak clearly. Recreate your brief''s reference video as closely as you can; if there isn''t one, take inspiration from the videos of that kind you see every day.', null),
('rhythm', 'en', 5, 'The rhythm 📅', '1 video a day, posted on TikTok and on Instagram. Consistency matters more than anything. Every day we give you the brief and every asset you need: reference video, hook, app visuals.', null),
('community', 'en', 6, 'The community 💬', 'Join our Slack to ask questions, get tips and chat with the other creators.', 'Join the Slack'),
('ruul', 'en', 7, 'Getting paid with Ruul 💸', 'It''s simple: you create your Ruul account, add your IBAN and complete the identity check, then you receive your payments every week. Until Ruul is set up, we can''t pay you.', 'See the Ruul guide'),
('start', 'en', 8, 'Let''s go 🚀', 'First step: the warm-up of your TikTok and Instagram accounts (24 hours minimum). Your first brief arrives as soon as it''s validated.', 'Let''s go'),
-- Español
('welcome', 'es', 1, 'Bienvenido/a a Vik Studios 👋', 'Vik Studios es un pequeño estudio que crea apps móviles. Para darlas a conocer, trabajamos con creadores/as UGC: personas como tú que graban videos auténticos en TikTok e Instagram. Por eso estás aquí.', null),
('win_win', 'es', 2, 'Ganamos todos 🤝', 'Buscamos personas constantes a las que les guste hacer videos. Si no estás listo/a para publicar cada día, si no te gusta grabar videos o si las tarifas no te convienen, por favor no sigas: es mejor para todos, y sin problema.', null),
('warmup', 'es', 3, 'Primero, una cuenta calentada 🔥', 'Para que tus videos funcionen, tu cuenta tiene que estar «calentada». Durante 1 o 2 días (24 h mínimo), úsala como una persona real: scroll, likes y seguir cuentas del nicho de estudio. Sin esto, la cuenta corre el riesgo de shadowban. El paso «Warm-up» de tu espacio te guía paso a paso, y tu primer brief llega justo después.', null),
('videos', 'es', 4, 'Hacer buenos videos 🎬', 'Edita tus videos idealmente en CapCut o Edits. Busca buena luz (luz natural de frente) y habla claro. Recrea lo más fiel posible el video de referencia de tu brief; si no hay, inspírate en los videos de ese tipo que ves cada día.', null),
('rhythm', 'es', 5, 'El ritmo 📅', '1 video al día, publicado en TikTok y en Instagram. La constancia es lo más importante. Cada día te damos el brief y todos los recursos que necesitas: video de referencia, hook, visuales de la app.', null),
('community', 'es', 6, 'La comunidad 💬', 'Únete a nuestro Slack para hacer preguntas, recibir consejos y hablar con los demás creadores/as.', 'Unirme al Slack'),
('ruul', 'es', 7, 'Cobrar con Ruul 💸', 'Es simple: creas tu cuenta de Ruul, agregas tu IBAN o cuenta bancaria y haces la verificación de identidad, y recibes tus pagos cada semana. Mientras Ruul no esté configurado, no podemos pagarte.', 'Ver la guía de Ruul'),
('start', 'es', 8, '¡Vamos! 🚀', 'Primer paso: el warm-up de tus cuentas de TikTok e Instagram (24 h mínimo). Tu primer brief llega en cuanto esté validado.', 'Empezar')
on conflict (key, language) do nothing;
