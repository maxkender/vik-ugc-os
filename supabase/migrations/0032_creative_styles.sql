-- Créas : style (carte offre d'emploi / photo UGC / texte simple), contenu de la carte, texte de pub (primary text).
alter table public.recruitment_creatives add column if not exists style text not null default 'photo' check (style in ('card','photo','text'));
alter table public.recruitment_creatives add column if not exists card jsonb;
alter table public.recruitment_creatives add column if not exists ad_text text;
update public.recruitment_creatives set style = case when background_path is null then 'text' else 'photo' end where card is null;
