-- Ingestion plus fréquente (5 runs max par passage).
select cron.alter_job((select jobid from cron.job where jobname='vik_collect_poll'), schedule := '*/2 * * * *');
