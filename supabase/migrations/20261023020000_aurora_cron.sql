CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- The existing Vercel secret is provisioned separately in Vault, never in SQL history.
DO $$
DECLARE existing_job bigint;
BEGIN
 FOR existing_job IN SELECT jobid FROM cron.job WHERE jobname='travelmate-aurora-check'
 LOOP PERFORM cron.unschedule(existing_job); END LOOP;
 PERFORM cron.schedule('travelmate-aurora-check','*/15 0-2,16-23 * * *', $job$
  SELECT net.http_post(
   url := 'https://travel-mate-nine-rho.vercel.app/api/aurora-notifications/check',
   headers := jsonb_build_object(
    'Content-Type','application/json',
    'Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='travelmate_aurora_cron_secret')
   ),
   body := '{}'::jsonb,
   timeout_milliseconds := 55000
  );
 $job$);
END;
$$;
