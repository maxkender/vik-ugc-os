-- Candidature sans vidéo (17/11) : jeton à usage limité (J+3), relances J+1 / J+2, expiration J+3.
alter table public.applications add column if not exists video_token text unique;
alter table public.applications add column if not exists video_due_at timestamptz;
alter table public.applications add column if not exists video_reminders int not null default 0;
alter table public.applications add column if not exists video_received_at timestamptz;
alter table public.applications add column if not exists video_pending_since timestamptz;

-- Funnel : candidature envoyée sans vidéo (indicateur de l'étape).
alter table public.funnel_events drop constraint if exists funnel_events_event_check;
alter table public.funnel_events add constraint funnel_events_event_check check (event in ('view_join', 'start_apply', 'submit_apply', 'submit_no_video', 'video_added'));
create or replace function public.track_funnel(p_event text, p_country text default null, p_lang text default null,
  p_utm_source text default null, p_utm_campaign text default null, p_utm_content text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_event not in ('view_join', 'start_apply', 'submit_apply', 'submit_no_video') then return; end if;
  insert into public.funnel_events (event, country, lang, utm_source, utm_campaign, utm_content)
  values (p_event, case when upper(coalesce(p_country, '')) ~ '^[A-Z]{2}$' then upper(p_country) end,
    left(nullif(p_lang, ''), 10), left(nullif(p_utm_source, ''), 60), left(nullif(p_utm_campaign, ''), 120), left(nullif(p_utm_content, ''), 120));
end $$;
drop function if exists public.funnel_summary(int);
create or replace function public.funnel_summary(p_days int default 7)
returns table (country text, utm_content text, views bigint, starts bigint, submits bigint, no_video bigint)
language sql stable security definer set search_path = public as $$
  select country, utm_content,
    count(*) filter (where event = 'view_join'), count(*) filter (where event = 'start_apply'),
    count(*) filter (where event = 'submit_apply'), count(*) filter (where event = 'submit_no_video')
  from public.funnel_events
  where public.is_staff() and created_at >= now() - make_interval(days => least(greatest(p_days, 1), 90))
  group by 1, 2 order by 3 desc;
$$;

insert into public.email_templates (key, language, subject, body, button_label) values
('video_missing', 'fr', 'Candidature reçue : il manque ta vidéo', 'Salut {first_name},

Ta candidature est bien reçue, merci ! Il manque seulement ta vidéo de présentation (30–90 secondes, face caméra) : tu as **3 jours** pour l''ajouter, jusqu''au {due_date}.

Clique sur le bouton pour l''envoyer (fichier depuis ton téléphone, ou lien YouTube, Google Drive, iCloud…). Le lien est personnel.

Sans vidéo d''ici là, la candidature expire automatiquement.', 'Ajouter ma vidéo'),
('video_missing', 'en', 'Application received: your video is missing', 'Hi {first_name},

We got your application, thank you! Only your intro video is missing (30–90 seconds, talking to the camera): you have **3 days** to add it, until {due_date}.

Tap the button to send it (a file from your phone, or a YouTube, Google Drive, iCloud… link). The link is personal.

Without a video by then, the application expires automatically.', 'Add my video'),
('video_missing', 'es', 'Postulación recibida: falta tu video', 'Hola {first_name}:

¡Recibimos tu postulación, gracias! Solo falta tu video de presentación (30–90 segundos, hablando a cámara): tienes **3 días** para agregarlo, hasta el {due_date}.

Toca el botón para enviarlo (archivo desde tu celular, o link de YouTube, Google Drive, iCloud…). El link es personal.

Sin video para esa fecha, la postulación expira automáticamente.', 'Agregar mi video'),
('video_missing', 'de', 'Bewerbung erhalten: dein Video fehlt noch', 'Hi {first_name},

Deine Bewerbung ist angekommen, danke! Es fehlt nur noch dein Vorstellungsvideo (30–90 Sekunden, in die Kamera gesprochen): Du hast **3 Tage** Zeit, bis zum {due_date}.

Tippe auf den Button, um es zu senden (Datei vom Handy oder Link von YouTube, Google Drive, iCloud…). Der Link ist persönlich.

Ohne Video bis dahin läuft die Bewerbung automatisch ab.', 'Video hinzufügen'),
('video_missing', 'it', 'Candidatura ricevuta: manca il tuo video', 'Ciao {first_name},

Abbiamo ricevuto la tua candidatura, grazie! Manca solo il tuo video di presentazione (30–90 secondi, parlando in camera): hai **3 giorni** per aggiungerlo, fino al {due_date}.

Tocca il pulsante per inviarlo (file dal telefono o link YouTube, Google Drive, iCloud…). Il link è personale.

Senza video entro quella data, la candidatura scade automaticamente.', 'Aggiungi il mio video'),
('video_reminder_1', 'fr', 'Plus que 2 jours pour ajouter ta vidéo', 'Salut {first_name},

Petit rappel : il te reste **2 jours** pour ajouter ta vidéo de présentation, jusqu''au {due_date}. Sans elle, on ne peut pas étudier ta candidature.', 'Ajouter ma vidéo'),
('video_reminder_1', 'en', '2 days left to add your video', 'Hi {first_name},

Quick reminder: you have **2 days** left to add your intro video, until {due_date}. Without it, we can''t review your application.', 'Add my video'),
('video_reminder_1', 'es', 'Te quedan 2 días para agregar tu video', 'Hola {first_name}:

Un recordatorio: te quedan **2 días** para agregar tu video de presentación, hasta el {due_date}. Sin él, no podemos revisar tu postulación.', 'Agregar mi video'),
('video_reminder_1', 'de', 'Noch 2 Tage für dein Video', 'Hi {first_name},

Kurze Erinnerung: Du hast noch **2 Tage**, um dein Vorstellungsvideo hinzuzufügen, bis zum {due_date}. Ohne Video können wir deine Bewerbung nicht prüfen.', 'Video hinzufügen'),
('video_reminder_1', 'it', 'Ancora 2 giorni per aggiungere il tuo video', 'Ciao {first_name},

Un promemoria: hai ancora **2 giorni** per aggiungere il tuo video di presentazione, fino al {due_date}. Senza, non possiamo valutare la tua candidatura.', 'Aggiungi il mio video'),
('video_reminder_2', 'fr', 'Dernier jour pour ajouter ta vidéo', 'Salut {first_name},

C''est le **dernier jour** pour ajouter ta vidéo de présentation (jusqu''au {due_date}). Après, ta candidature expirera.', 'Ajouter ma vidéo'),
('video_reminder_2', 'en', 'Last day to add your video', 'Hi {first_name},

Today is the **last day** to add your intro video (until {due_date}). After that, your application will expire.', 'Add my video'),
('video_reminder_2', 'es', 'Último día para agregar tu video', 'Hola {first_name}:

Hoy es el **último día** para agregar tu video de presentación (hasta el {due_date}). Después, tu postulación expirará.', 'Agregar mi video'),
('video_reminder_2', 'de', 'Letzter Tag für dein Video', 'Hi {first_name},

Heute ist der **letzte Tag**, um dein Vorstellungsvideo hinzuzufügen (bis zum {due_date}). Danach läuft deine Bewerbung ab.', 'Video hinzufügen'),
('video_reminder_2', 'it', 'Ultimo giorno per aggiungere il tuo video', 'Ciao {first_name},

Oggi è l''**ultimo giorno** per aggiungere il tuo video di presentazione (fino al {due_date}). Dopo, la candidatura scadrà.', 'Aggiungi il mio video'),
('video_expired', 'fr', 'Ta candidature a expiré', 'Salut {first_name},

On n''a pas reçu ta vidéo de présentation dans les 3 jours, ta candidature a donc expiré. Aucun souci : tu peux recommencer quand tu veux, ça prend 3 minutes.', 'Recommencer ma candidature'),
('video_expired', 'en', 'Your application has expired', 'Hi {first_name},

We didn''t receive your intro video within 3 days, so your application has expired. No problem: you can start again whenever you like, it takes 3 minutes.', 'Start again'),
('video_expired', 'es', 'Tu postulación expiró', 'Hola {first_name}:

No recibimos tu video de presentación en 3 días, así que tu postulación expiró. Sin problema: puedes volver a postular cuando quieras, toma 3 minutos.', 'Volver a postular'),
('video_expired', 'de', 'Deine Bewerbung ist abgelaufen', 'Hi {first_name},

Wir haben dein Vorstellungsvideo nicht innerhalb von 3 Tagen erhalten, daher ist deine Bewerbung abgelaufen. Kein Problem: Du kannst jederzeit neu starten, es dauert 3 Minuten.', 'Neu bewerben'),
('video_expired', 'it', 'La tua candidatura è scaduta', 'Ciao {first_name},

Non abbiamo ricevuto il tuo video di presentazione entro 3 giorni, quindi la candidatura è scaduta. Nessun problema: puoi ricominciare quando vuoi, bastano 3 minuti.', 'Ricomincia la candidatura')
on conflict (key, language) do nothing;
grant execute on function public.funnel_summary(int) to authenticated; revoke execute on function public.funnel_summary(int) from public, anon;
