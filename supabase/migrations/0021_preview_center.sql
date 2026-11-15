-- Contenus & aperçus (V3) : historique des versions d'emails, textes de landing par pays/langue.

create table if not exists public.email_template_versions (
  id bigserial primary key,
  key text not null,
  language text not null,
  subject text not null,
  body text not null,
  button_label text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);
create index if not exists email_template_versions_idx on public.email_template_versions (key, language, created_at desc);
alter table public.email_template_versions enable row level security;
drop policy if exists email_template_versions_admin on public.email_template_versions;
create policy email_template_versions_admin on public.email_template_versions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Avant chaque modification d'un modèle, on archive la version précédente (automatique, quel que soit l'écran).
create or replace function public.archive_email_template() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (old.subject, old.body, coalesce(old.button_label, '')) is distinct from (new.subject, new.body, coalesce(new.button_label, '')) then
    insert into public.email_template_versions (key, language, subject, body, button_label, created_at, created_by)
    values (old.key, old.language, old.subject, old.body, old.button_label, old.updated_at, auth.uid());
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists email_templates_archive on public.email_templates;
create trigger email_templates_archive before update on public.email_templates for each row execute function public.archive_email_template();
revoke execute on function public.archive_email_template() from public, anon, authenticated;

-- Textes de la landing « job » surchargés par pays et langue (clé i18n → valeur). Lecture publique.
create table if not exists public.landing_overrides (
  country_code text not null references public.countries(code) on delete cascade,
  language text not null,
  key text not null,            -- landing.title, landing.subtitle, landing.badge, landing.cta, landing.faq.0.q, landing.faq.0.a …
  value text not null,
  updated_at timestamptz not null default now(),
  primary key (country_code, language, key)
);
alter table public.landing_overrides enable row level security;
drop policy if exists landing_overrides_read on public.landing_overrides;
create policy landing_overrides_read on public.landing_overrides for select to anon, authenticated using (true);
drop policy if exists landing_overrides_admin on public.landing_overrides;
create policy landing_overrides_admin on public.landing_overrides for all to authenticated using (public.is_admin()) with check (public.is_admin());
