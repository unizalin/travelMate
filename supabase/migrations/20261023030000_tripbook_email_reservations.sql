-- Reservations never grant access. Only a confirmed claim grants membership.
CREATE TABLE public.tripbook_email_reservations (
  trip_id uuid NOT NULL REFERENCES public.tripbook_fixed_journey(trip_id),
  member_id text NOT NULL,
  email text NOT NULL CHECK (email = lower(btrim(email))),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (trip_id, member_id),
  UNIQUE (trip_id, email)
);
ALTER TABLE public.tripbook_email_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tripbook_email_reservations FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.tripbook_set_email_reservation(p_trip_id uuid, p_member_id text, p_email text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_email text := lower(btrim(p_email, E' \t\n\r'));
BEGIN
  IF NOT public.tripbook_is_admin() OR NOT public.tripbook_is_admin(p_trip_id) THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='admin_required';
  END IF;
  PERFORM 1 FROM public.tripbook_fixed_journey WHERE trip_id=p_trip_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'journey_not_found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tripbook_journeys j, jsonb_array_elements(j.journey->'members') m
    WHERE j.trip_id=p_trip_id AND m->>'id'=p_member_id) THEN RAISE EXCEPTION 'unknown_member'; END IF;
  IF p_email IS NULL THEN
    DELETE FROM public.tripbook_email_reservations WHERE trip_id=p_trip_id AND member_id=p_member_id;
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.tripbook_member_claims WHERE trip_id=p_trip_id AND member_id=p_member_id) THEN
    RAISE EXCEPTION 'member_already_claimed';
  END IF;
  IF char_length(v_email)>254 OR char_length(split_part(v_email,'@',1))>64
    OR v_email !~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
    OR split_part(v_email,'@',1) LIKE '.%' OR split_part(v_email,'@',1) LIKE '%.' OR v_email LIKE '%..%' THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;
  IF EXISTS (SELECT 1 FROM public.tripbook_member_claims c JOIN auth.users u ON u.id=c.user_id
    WHERE c.trip_id=p_trip_id AND lower(btrim(u.email))=v_email) THEN
    RAISE EXCEPTION 'account_already_claimed';
  END IF;
  IF EXISTS (SELECT 1 FROM public.tripbook_email_reservations WHERE trip_id=p_trip_id AND email=v_email AND member_id<>p_member_id) THEN
    RAISE EXCEPTION 'email_already_reserved';
  END IF;
  INSERT INTO public.tripbook_email_reservations(trip_id,member_id,email) VALUES(p_trip_id,p_member_id,v_email)
  ON CONFLICT(trip_id,member_id) DO UPDATE SET email=excluded.email,created_at=now();
END;
$$;

CREATE FUNCTION public.tripbook_match_email_reservation(p_trip_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_match jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='not_authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.tripbook_member_claims WHERE trip_id=p_trip_id AND user_id=auth.uid()) THEN RETURN NULL; END IF;
  SELECT jsonb_build_object('id',r.member_id,'name',m->>'displayName') INTO v_match
  FROM public.tripbook_email_reservations r
  JOIN auth.users u ON u.id=auth.uid() AND u.email_confirmed_at IS NOT NULL AND lower(btrim(u.email))=r.email
  JOIN public.tripbook_journeys j ON j.trip_id=r.trip_id
  CROSS JOIN jsonb_array_elements(j.journey->'members') m
  WHERE r.trip_id=p_trip_id AND m->>'id'=r.member_id
    AND NOT EXISTS (SELECT 1 FROM public.tripbook_member_claims c WHERE c.trip_id=r.trip_id AND c.member_id=r.member_id);
  RETURN v_match;
END;
$$;

CREATE FUNCTION public.tripbook_confirm_email_reservation(p_trip_id uuid,p_member_id text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='not_authenticated'; END IF;
  -- Same serialization point as join/rotate/revoke/remove; recheck every condition under the lock.
  PERFORM 1 FROM public.tripbook_fixed_journey WHERE trip_id=p_trip_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'journey_not_found'; END IF;
  IF EXISTS (SELECT 1 FROM public.tripbook_member_claims WHERE trip_id=p_trip_id AND user_id=auth.uid()) THEN
    RAISE EXCEPTION 'account_already_claimed';
  END IF;
  IF EXISTS (SELECT 1 FROM public.tripbook_member_claims WHERE trip_id=p_trip_id AND member_id=p_member_id) THEN
    RAISE EXCEPTION 'member_already_claimed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tripbook_email_reservations r
    JOIN auth.users u ON u.id=auth.uid() AND u.email_confirmed_at IS NOT NULL AND lower(btrim(u.email))=r.email
    JOIN public.tripbook_journeys j ON j.trip_id=r.trip_id
    CROSS JOIN jsonb_array_elements(j.journey->'members') m
    WHERE r.trip_id=p_trip_id AND r.member_id=p_member_id AND m->>'id'=r.member_id) THEN
    RAISE EXCEPTION 'email_reservation_mismatch';
  END IF;
  INSERT INTO public.tripbook_member_claims(trip_id,member_id,user_id) VALUES(p_trip_id,p_member_id,auth.uid());
  DELETE FROM public.tripbook_email_reservations WHERE trip_id=p_trip_id AND member_id=p_member_id;
  RETURN jsonb_build_object('tripId',p_trip_id);
END;
$$;

-- An invitation claim also consumes any pending reservation for that identity.
CREATE FUNCTION public.tripbook_clear_claimed_reservation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  DELETE FROM public.tripbook_email_reservations WHERE trip_id=NEW.trip_id AND member_id=NEW.member_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER tripbook_claim_consumes_reservation AFTER INSERT ON public.tripbook_member_claims
FOR EACH ROW EXECUTE FUNCTION public.tripbook_clear_claimed_reservation();

CREATE OR REPLACE FUNCTION public.tripbook_admin_state(p_trip_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, extensions AS $$
DECLARE v_trip uuid;
BEGIN
  IF NOT public.tripbook_is_admin(p_trip_id) THEN RETURN jsonb_build_object('isAdmin',false); END IF;
  SELECT trip_id INTO v_trip FROM public.tripbook_fixed_journey WHERE trip_id=p_trip_id;
  RETURN jsonb_build_object('isAdmin',true,'inviteActive',EXISTS(SELECT 1 FROM public.tripbook_invitations WHERE trip_id=v_trip AND revoked_at IS NULL),
    'members',(SELECT jsonb_agg(jsonb_build_object('id',m->>'id','name',m->>'displayName','email',u.email,'claimedAt',c.claimed_at,
      'isOwner',COALESCE(c.user_id=j.owner_id,false),'reservedEmail',CASE WHEN c.user_id IS NULL THEN r.email ELSE NULL END) ORDER BY m->>'id')
    FROM public.tripbook_journeys j CROSS JOIN jsonb_array_elements(j.journey->'members') m
    LEFT JOIN public.tripbook_member_claims c ON c.trip_id=j.trip_id AND c.member_id=m->>'id'
    LEFT JOIN auth.users u ON u.id=c.user_id
    LEFT JOIN public.tripbook_email_reservations r ON r.trip_id=j.trip_id AND r.member_id=m->>'id'
    WHERE j.trip_id=v_trip));
END;
$$;
REVOKE ALL ON FUNCTION public.tripbook_set_email_reservation(uuid,text,text),public.tripbook_match_email_reservation(uuid),public.tripbook_confirm_email_reservation(uuid,text),public.tripbook_clear_claimed_reservation(),public.tripbook_admin_state(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.tripbook_set_email_reservation(uuid,text,text),public.tripbook_match_email_reservation(uuid),public.tripbook_confirm_email_reservation(uuid,text),public.tripbook_admin_state(uuid) TO authenticated;
