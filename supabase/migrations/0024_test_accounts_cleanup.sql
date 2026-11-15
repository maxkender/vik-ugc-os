-- Comptes de test (profiles.is_test) : purge de l'historique et garde-fou en base.

-- 1. Paie : aucune ligne pour un compte de test (même l'historique de démo « Zoé Martin-E2E »).
delete from public.payouts p using public.profiles pr where pr.id = p.poster_id and pr.is_test;

create or replace function public.payouts_skip_test() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.profiles where id = new.poster_id and is_test) then
    return null; -- ignoré silencieusement : un compte de test n'est jamais payé
  end if;
  return new;
end $$;
drop trigger if exists payouts_skip_test on public.payouts;
create trigger payouts_skip_test before insert or update on public.payouts
  for each row execute function public.payouts_skip_test();

-- 2. Journal de l'assistant : purge des conversations de démo QA (messages en cascade).
delete from public.assistant_conversations c using public.profiles pr where pr.id = c.poster_id and pr.is_test;
