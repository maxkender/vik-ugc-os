-- Déclencheurs métier + tâches planifiées (pg_cron → edge functions via pg_net, en-tête x-cron-secret lu dans Vault).
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Premier lien posté → candidature « Actif ».
create or replace function public.mark_application_active() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.posted_url is not null and (old.posted_url is null) then
    update public.applications set status = 'active' where poster_id = new.poster_id and status = 'signed';
  end if;
  return new;
end $$;
drop trigger if exists assignments_mark_active on public.brief_assignments;
create trigger assignments_mark_active after update of posted_url on public.brief_assignments
  for each row execute function public.mark_application_active();

-- Appel d'une edge function depuis pg_cron.
create or replace function public.call_function(p_name text, p_body jsonb default '{}'::jsonb) returns bigint
language plpgsql security definer set search_path = public, vault, net as $$
declare
  v_url text := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url');
  v_secret text := (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret');
begin
  return net.http_post(
    url := v_url || '/functions/v1/' || p_name,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body := p_body,
    timeout_milliseconds := 120000
  );
end $$;
revoke execute on function public.call_function(text, jsonb) from public, anon, authenticated;

-- (Re)planification idempotente. Heures en UTC.
do $$
declare j record;
begin
  for j in select jobname from cron.job where jobname like 'vik_%' loop
    perform cron.unschedule(j.jobname);
  end loop;
end $$;

select cron.schedule('vik_collect_poll',    '*/5 * * * *',  $$select public.call_function('collect', '{"action":"poll"}')$$);
select cron.schedule('vik_collect_due',     '17 * * * *',   $$select public.call_function('collect', '{"action":"run_due"}')$$);   -- ne fait rien tant que apify.collect_cron_enabled = false
select cron.schedule('vik_measure_views',   '40 6 * * *',   $$select public.call_function('collect', '{"action":"measure_due"}')$$);
select cron.schedule('vik_rescore',         '10 3 * * *',   $$select public.call_function('collect', '{"action":"rescore"}')$$);
select cron.schedule('vik_emails',          '*/5 * * * *',  $$select public.call_function('emails', '{"action":"process"}')$$);
select cron.schedule('vik_recruit',         '25 * * * *',   $$select public.call_function('recruit', '{"action":"cron"}')$$);
select cron.schedule('vik_briefs_dispatch', '0 5 * * *',    $$select public.call_function('briefs', '{"action":"dispatch"}')$$);
select cron.schedule('vik_payroll',         '0 7 * * 1',    $$select public.call_function('payroll', '{"action":"compute"}')$$);
select cron.schedule('vik_ruul',            '30 9 * * *',   $$select public.call_function('payroll', '{"action":"ruul_cron"}')$$);
select cron.schedule('vik_meta_insights',   '15 */6 * * *', $$select public.call_function('meta', '{"action":"sync_insights"}')$$);

-- Réglages découverts pendant la validation (14/11).
update public.settings set value = value || jsonb_build_object('page_id', '1209366402267598', 'page_name', 'Sophia', 'beneficiary', 'Vik Studios')
 where key = 'meta' and coalesce(value->>'page_id', '') = '';
update public.settings set value = jsonb_set(value, '{actors,facebook_ads}', '"apify~facebook-ads-scraper"') where key = 'apify';
update public.sources set value = '102545774445089' where platform = 'facebook_ads' and value = 'Knowunity';
