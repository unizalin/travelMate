DO $$
DECLARE line_job bigint; matching_jobs integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM vault.secrets WHERE name='travelmate_aurora_cron_secret') THEN
  RAISE EXCEPTION 'line_cron_secret_missing';
 END IF;
 SELECT count(*),min(jobid) INTO matching_jobs,line_job FROM cron.job WHERE jobname='travelmate-line-aurora-check';
 IF matching_jobs>1 THEN RAISE EXCEPTION 'duplicate_line_cron_jobs'; END IF;
 IF matching_jobs=1 THEN
  PERFORM cron.alter_job(line_job,schedule := '*/15 0-2,16-23 * * *',command := $job$
   SELECT net.http_post(
    url := 'https://travel-mate-nine-rho.vercel.app/api/line?action=check',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' ||
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='travelmate_aurora_cron_secret')),
    body := '{}'::jsonb,timeout_milliseconds := 55000
   ) WHERE now()<'2026-11-07T12:00:00Z'::timestamptz;
  $job$,active := true);
 ELSE
  PERFORM cron.schedule('travelmate-line-aurora-check','*/15 0-2,16-23 * * *',$job$
   SELECT net.http_post(
    url := 'https://travel-mate-nine-rho.vercel.app/api/line?action=check',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' ||
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='travelmate_aurora_cron_secret')),
    body := '{}'::jsonb,timeout_milliseconds := 55000
   ) WHERE now()<'2026-11-07T12:00:00Z'::timestamptz;
  $job$);
 END IF;
 IF (SELECT count(*) FROM cron.job WHERE jobname='travelmate-line-aurora-check' AND active)<>1 THEN
  RAISE EXCEPTION 'line_cron_not_active';
 END IF;
END;
$$;
