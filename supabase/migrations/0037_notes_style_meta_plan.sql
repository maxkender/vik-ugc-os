-- Style de créa « Notes iPhone » (16/11).
alter table public.recruitment_creatives drop constraint if exists recruitment_creatives_style_check;
alter table public.recruitment_creatives add constraint recruitment_creatives_style_check check (style in ('card','photo','text','notes'));
