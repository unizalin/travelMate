DO $$
DECLARE line_job bigint;
BEGIN
 FOR line_job IN SELECT jobid FROM cron.job WHERE jobname='travelmate-line-aurora-check'
 LOOP PERFORM cron.alter_job(line_job,active := false); END LOOP;
 IF EXISTS(SELECT 1 FROM cron.job WHERE jobname='travelmate-line-aurora-check' AND active) THEN
  RAISE EXCEPTION 'line_push_job_still_active';
 END IF;
END;
$$;
