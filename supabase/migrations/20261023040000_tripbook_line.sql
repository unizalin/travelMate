CREATE TABLE public.tripbook_line_contacts (
 line_user_id text PRIMARY KEY CHECK(line_user_id ~ '^U[0-9a-f]{32}$'),
 blocked boolean NOT NULL,
 last_event_at bigint NOT NULL
);
ALTER TABLE public.tripbook_line_contacts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tripbook_line_contacts FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.tripbook_line_contacts TO service_role;
CREATE TABLE public.tripbook_line_bindings (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 line_user_id text UNIQUE NOT NULL CHECK(line_user_id ~ '^U[0-9a-f]{32}$'),
 link_id uuid NOT NULL DEFAULT gen_random_uuid(),
 aurora_enabled boolean NOT NULL DEFAULT false,
 blocked boolean NOT NULL DEFAULT false,
 last_event_at bigint NOT NULL DEFAULT 0,
 expires_at timestamptz NOT NULL DEFAULT '2026-11-07T12:00:00Z'
);
CREATE TABLE public.tripbook_line_tickets (
 ticket_hash text PRIMARY KEY CHECK(ticket_hash ~ '^[0-9a-f]{64}$'),
 line_user_id text NOT NULL CHECK(line_user_id ~ '^U[0-9a-f]{32}$'),
 link_token text NOT NULL CHECK(length(link_token) BETWEEN 1 AND 1024),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '9 minutes',
 user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
 nonce_hash text UNIQUE CHECK(nonce_hash ~ '^[0-9a-f]{64}$')
);
CREATE TABLE public.tripbook_line_deliveries (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 night_date date NOT NULL,
 retry_key uuid NOT NULL DEFAULT gen_random_uuid(),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3),
 sent boolean NOT NULL DEFAULT false,
 PRIMARY KEY(user_id,night_date)
);
CREATE TABLE public.tripbook_line_events (
 event_id text PRIMARY KEY CHECK(length(event_id) BETWEEN 1 AND 128),
 owner uuid NOT NULL,
 expires_at timestamptz NOT NULL,
 completed boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.tripbook_line_worker (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 owner uuid,
 expires_at timestamptz NOT NULL DEFAULT '-infinity'
);
INSERT INTO public.tripbook_line_worker(singleton) VALUES(true);

ALTER TABLE public.tripbook_line_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tripbook_line_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tripbook_line_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tripbook_line_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tripbook_line_worker ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tripbook_line_bindings,public.tripbook_line_tickets,public.tripbook_line_deliveries,public.tripbook_line_events,public.tripbook_line_worker FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.tripbook_line_bindings,public.tripbook_line_tickets,public.tripbook_line_deliveries,public.tripbook_line_events,public.tripbook_line_worker TO service_role;

CREATE FUNCTION public.tripbook_line_is_member(p_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT p_user_id IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.tripbook_fixed_journey f JOIN public.tripbook_journeys j USING(trip_id)
  WHERE j.owner_id=p_user_id OR EXISTS(SELECT 1 FROM public.tripbook_member_claims c WHERE c.trip_id=f.trip_id AND c.user_id=p_user_id)
 );
$$;

CREATE FUNCTION public.tripbook_line_create_ticket(p_hash text,p_line_id text,p_token text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('tripbook_line_link'));
 DELETE FROM public.tripbook_line_tickets WHERE expires_at<=now() OR line_user_id=p_line_id;
 INSERT INTO public.tripbook_line_tickets(ticket_hash,line_user_id,link_token) VALUES(p_hash,p_line_id,p_token);
END;
$$;

CREATE FUNCTION public.tripbook_line_prepare_link(p_hash text,p_user_id uuid,p_nonce_hash text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE t public.tripbook_line_tickets;
BEGIN
 IF NOT public.tripbook_line_is_member(p_user_id) THEN RAISE EXCEPTION 'membership_required'; END IF;
 SELECT * INTO t FROM public.tripbook_line_tickets WHERE ticket_hash=p_hash AND expires_at>now() FOR UPDATE;
 IF NOT FOUND OR t.user_id IS NOT NULL THEN RAISE EXCEPTION 'link_expired'; END IF;
 UPDATE public.tripbook_line_tickets SET user_id=p_user_id,nonce_hash=p_nonce_hash WHERE ticket_hash=p_hash;
 RETURN t.link_token;
END;
$$;

CREATE FUNCTION public.tripbook_line_finish_link(p_nonce_hash text,p_line_id text,p_ok boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE t public.tripbook_line_tickets;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('tripbook_line_link'));
 SELECT * INTO t FROM public.tripbook_line_tickets WHERE nonce_hash=p_nonce_hash AND expires_at>now() FOR UPDATE;
 IF NOT FOUND OR t.line_user_id<>p_line_id OR t.user_id IS NULL THEN RETURN false; END IF;
 DELETE FROM public.tripbook_line_tickets WHERE ticket_hash=t.ticket_hash;
 IF NOT p_ok OR NOT public.tripbook_line_is_member(t.user_id) THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM public.tripbook_line_bindings WHERE (user_id=t.user_id AND line_user_id<>p_line_id) OR (line_user_id=p_line_id AND user_id<>t.user_id)) THEN RETURN false; END IF;
 INSERT INTO public.tripbook_line_bindings(user_id,line_user_id,blocked,last_event_at)
 SELECT t.user_id,p_line_id,coalesce(c.blocked,false),coalesce(c.last_event_at,0)
 FROM (SELECT 1) seed LEFT JOIN public.tripbook_line_contacts c ON c.line_user_id=p_line_id
 ON CONFLICT(user_id) DO NOTHING;
 RETURN true;
END;
$$;

CREATE FUNCTION public.tripbook_line_set_preference(p_user_id uuid,p_enabled boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NOT public.tripbook_line_is_member(p_user_id) THEN RAISE EXCEPTION 'membership_required'; END IF;
 UPDATE public.tripbook_line_bindings SET aurora_enabled=p_enabled
 WHERE user_id=p_user_id AND (NOT p_enabled OR (NOT blocked AND expires_at>now()));
 IF NOT FOUND THEN RAISE EXCEPTION 'active_link_required'; END IF;
END;
$$;

CREATE FUNCTION public.tripbook_line_unlink(p_user_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('tripbook_line_link'));
 DELETE FROM public.tripbook_line_tickets WHERE user_id=p_user_id;
 DELETE FROM public.tripbook_line_bindings WHERE user_id=p_user_id;
END;
$$;

CREATE FUNCTION public.tripbook_line_block(p_line_id text,p_blocked boolean,p_timestamp bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('tripbook_line_link'));
 INSERT INTO public.tripbook_line_contacts(line_user_id,blocked,last_event_at) VALUES(p_line_id,p_blocked,p_timestamp)
 ON CONFLICT(line_user_id) DO UPDATE SET blocked=p_blocked,last_event_at=p_timestamp WHERE tripbook_line_contacts.last_event_at<p_timestamp;
 UPDATE public.tripbook_line_bindings SET blocked=p_blocked,
 aurora_enabled=CASE WHEN p_blocked THEN false ELSE aurora_enabled END,last_event_at=p_timestamp
 WHERE line_user_id=p_line_id AND p_timestamp>last_event_at;
END;
$$;

CREATE FUNCTION public.tripbook_line_event(p_event text,p_owner uuid,p_complete boolean) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF p_owner IS NULL THEN RETURN 'busy'; END IF;
 IF p_complete THEN
  UPDATE public.tripbook_line_events SET completed=true WHERE event_id=p_event AND owner=p_owner;
 ELSE
  DELETE FROM public.tripbook_line_events WHERE created_at<now()-interval '7 days';
  INSERT INTO public.tripbook_line_events(event_id,owner,expires_at) VALUES(p_event,p_owner,now()+interval '1 minute')
  ON CONFLICT(event_id) DO UPDATE SET owner=p_owner,expires_at=now()+interval '1 minute'
  WHERE NOT tripbook_line_events.completed AND tripbook_line_events.expires_at<now();
 END IF;
 IF FOUND THEN RETURN CASE WHEN p_complete THEN 'completed' ELSE 'claimed' END; END IF;
 IF EXISTS(SELECT 1 FROM public.tripbook_line_events WHERE event_id=p_event AND completed) THEN RETURN 'completed'; END IF;
 RETURN 'busy';
END;
$$;

CREATE FUNCTION public.tripbook_line_lease(p_owner uuid,p_release boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF p_owner IS NULL THEN RETURN false; END IF;
 IF p_release THEN
  UPDATE public.tripbook_line_worker SET owner=NULL,expires_at='-infinity' WHERE singleton AND owner=p_owner;
 ELSE
  UPDATE public.tripbook_line_worker SET owner=p_owner,expires_at=now()+interval '5 minutes' WHERE singleton AND expires_at<now();
 END IF;
 RETURN FOUND;
END;
$$;

CREATE FUNCTION public.tripbook_line_claim_delivery(p_user_id uuid,p_link_id uuid,p_night date) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE b public.tripbook_line_bindings; d public.tripbook_line_deliveries;
BEGIN
 SELECT * INTO b FROM public.tripbook_line_bindings WHERE user_id=p_user_id AND link_id=p_link_id AND aurora_enabled AND NOT blocked AND expires_at>now() FOR UPDATE;
 IF NOT FOUND OR NOT public.tripbook_line_is_member(p_user_id) OR p_night<'2026-10-30' OR p_night>'2026-11-06' THEN RETURN NULL; END IF;
 INSERT INTO public.tripbook_line_deliveries(user_id,night_date) VALUES(p_user_id,p_night) ON CONFLICT DO NOTHING;
 UPDATE public.tripbook_line_deliveries SET attempts=attempts+1
 WHERE user_id=p_user_id AND night_date=p_night AND NOT sent AND attempts<3 RETURNING * INTO d;
 IF NOT FOUND THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('lineUserId',b.line_user_id,'retryKey',d.retry_key);
END;
$$;

DO $$
DECLARE f record;
BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN ('tripbook_line_is_member','tripbook_line_create_ticket','tripbook_line_prepare_link','tripbook_line_finish_link','tripbook_line_set_preference','tripbook_line_unlink','tripbook_line_block','tripbook_line_event','tripbook_line_lease','tripbook_line_claim_delivery') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
 END LOOP;
END;
$$;
