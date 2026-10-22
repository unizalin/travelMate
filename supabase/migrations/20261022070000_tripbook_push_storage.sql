CREATE TABLE public.tripbook_push_subscriptions (
 id text PRIMARY KEY CHECK (id ~ '^[a-f0-9]{64}$'),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 city_id text NOT NULL,night_date date NOT NULL,expires_at timestamptz NOT NULL,
 subscription jsonb,enabled boolean NOT NULL DEFAULT false,last_sent_night date,attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3)
);
CREATE INDEX tripbook_push_active_idx ON public.tripbook_push_subscriptions(enabled,expires_at);
ALTER TABLE public.tripbook_push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tripbook_push_subscriptions FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.tripbook_push_subscriptions TO service_role;
CREATE TABLE public.tripbook_push_worker_lease (id boolean PRIMARY KEY DEFAULT true CHECK(id),owner uuid,expires_at timestamptz NOT NULL DEFAULT '-infinity');
ALTER TABLE public.tripbook_push_worker_lease ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tripbook_push_worker_lease FROM PUBLIC,anon,authenticated;
INSERT INTO public.tripbook_push_worker_lease(id) VALUES(true);
CREATE FUNCTION public.tripbook_push_lease(p_owner uuid,p_release boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF p_owner IS NULL THEN RETURN false; END IF;
 IF p_release THEN
  UPDATE public.tripbook_push_worker_lease SET owner=NULL,expires_at='-infinity' WHERE id=true AND owner=p_owner;
 ELSE
  UPDATE public.tripbook_push_worker_lease SET owner=p_owner,expires_at=clock_timestamp()+interval '5 minutes' WHERE id=true AND expires_at<clock_timestamp();
 END IF;
 RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.tripbook_push_lease(uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.tripbook_push_lease(uuid,boolean) TO service_role;
