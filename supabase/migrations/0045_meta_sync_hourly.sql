-- Pubs actives (16/11 au soir) : synchro horaire des insights (dépense, clics, leads → CPL) et des statuts Meta.
alter table public.meta_campaigns add column if not exists effective_status text;
alter table public.meta_adsets add column if not exists effective_status text;
alter table public.meta_ads add column if not exists effective_status text;
select cron.unschedule('vik_meta_insights') where exists (select 1 from cron.job where jobname = 'vik_meta_insights');
select cron.schedule('vik_meta_insights', '5 * * * *', $$select public.call_function('meta', '{"action":"sync_insights"}')$$);
