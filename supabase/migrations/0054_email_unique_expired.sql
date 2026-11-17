-- Une candidature expirée (vidéo jamais envoyée) ne bloque pas une nouvelle candidature avec le même email.
drop index if exists public.applications_email_open_idx;
create unique index applications_email_open_idx on public.applications (lower(email)) where status not in ('rejected', 'expired');
