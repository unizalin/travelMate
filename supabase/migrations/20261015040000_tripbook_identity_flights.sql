-- Separate authoritative identities; legacy JSON accountId remains unbound.
CREATE TABLE public.tripbook_member_claims (
  trip_id uuid NOT NULL REFERENCES public.tripbook_journeys(trip_id) ON DELETE CASCADE,
  member_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  PRIMARY KEY (trip_id, member_id), UNIQUE (trip_id, user_id)
);
CREATE TABLE public.tripbook_flight_choices (
  trip_id uuid NOT NULL,
  member_id text NOT NULL,
  flight_id text NOT NULL,
  choice_group text NOT NULL,
  PRIMARY KEY (trip_id, member_id, choice_group),
  FOREIGN KEY (trip_id, member_id) REFERENCES public.tripbook_member_claims(trip_id, member_id) ON DELETE CASCADE
);
ALTER TABLE public.tripbook_member_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tripbook_flight_choices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tripbook_member_claims, public.tripbook_flight_choices FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.tripbook_roster(p_trip_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, extensions AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.tripbook_can_read(p_trip_id) THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='journey_access_required';
  END IF;
  RETURN jsonb_build_object(
    'claims', COALESCE((SELECT jsonb_agg(jsonb_build_object('memberId', c.member_id, 'name', NULLIF(btrim(p.display_name), ''), 'isSelf', c.user_id = auth.uid())) FROM public.tripbook_member_claims c LEFT JOIN public.profiles p ON p.id=c.user_id WHERE c.trip_id=p_trip_id), '[]'::jsonb),
    'choices', COALESCE((SELECT jsonb_agg(jsonb_build_object('memberId', member_id, 'flightId', flight_id)) FROM public.tripbook_flight_choices WHERE trip_id=p_trip_id), '[]'::jsonb));
END;
$$;
CREATE FUNCTION public.tripbook_claim_member(p_trip_id uuid, p_member_id text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, extensions AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.tripbook_can_edit(p_trip_id) THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='journey_editor_required';
  END IF;
  PERFORM 1 FROM public.tripbook_journeys WHERE trip_id=p_trip_id FOR UPDATE;
  IF p_member_id IS NULL THEN
    DELETE FROM public.tripbook_member_claims WHERE trip_id=p_trip_id AND user_id=auth.uid();
  ELSE
    IF NOT EXISTS (SELECT 1 FROM public.tripbook_journeys j, jsonb_array_elements(j.journey->'members') m WHERE j.trip_id=p_trip_id AND m->>'id'=p_member_id) THEN
      RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='unknown_member';
    END IF;
    IF EXISTS (SELECT 1 FROM public.tripbook_member_claims WHERE trip_id=p_trip_id AND member_id=p_member_id AND user_id<>auth.uid()) THEN
      RAISE EXCEPTION USING ERRCODE='23505', MESSAGE='member_already_claimed';
    END IF;
    IF EXISTS (SELECT 1 FROM public.tripbook_member_claims WHERE trip_id=p_trip_id AND user_id=auth.uid() AND member_id<>p_member_id) THEN
      RAISE EXCEPTION USING ERRCODE='23505', MESSAGE='release_current_identity_first';
    END IF;
    INSERT INTO public.tripbook_member_claims VALUES(p_trip_id,p_member_id,auth.uid()) ON CONFLICT DO NOTHING;
  END IF;
  RETURN public.tripbook_roster(p_trip_id);
END;
$$;
CREATE FUNCTION public.tripbook_choose_flight(p_trip_id uuid, p_flight_id text, p_selected boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, extensions AS $$
DECLARE v_member text; v_group text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.tripbook_can_edit(p_trip_id) THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='journey_editor_required';
  END IF;
  PERFORM 1 FROM public.tripbook_journeys WHERE trip_id=p_trip_id FOR UPDATE;
  SELECT member_id INTO v_member FROM public.tripbook_member_claims WHERE trip_id=p_trip_id AND user_id=auth.uid();
  IF v_member IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='claim_identity_first'; END IF;
  v_group := CASE
    WHEN p_flight_id IN ('ba802','fi0501') THEN 'to-iceland'
    WHEN p_flight_id IN ('ba801','fi0454') THEN 'from-iceland'
    WHEN p_flight_id='ci0073' THEN 'outbound-taipei'
    WHEN p_flight_id IN ('br068-lhr','ci0082') THEN 'return-europe'
    WHEN p_flight_id='br068-bkk' THEN 'return-asia' END;
  IF v_group IS NULL OR p_selected IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='invalid_flight_choice'; END IF;
  IF p_selected THEN
    INSERT INTO public.tripbook_flight_choices VALUES(p_trip_id,v_member,p_flight_id,v_group)
    ON CONFLICT(trip_id,member_id,choice_group) DO UPDATE SET flight_id=excluded.flight_id;
  ELSE
    DELETE FROM public.tripbook_flight_choices WHERE trip_id=p_trip_id AND member_id=v_member AND flight_id=p_flight_id;
  END IF;
  RETURN public.tripbook_roster(p_trip_id);
END;
$$;
CREATE FUNCTION public.tripbook_protect_claimed_members() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, extensions AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.tripbook_member_claims c WHERE c.trip_id=OLD.trip_id AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.journey->'members') m WHERE m->>'id'=c.member_id)) THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='claimed_member_cannot_be_removed';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER tripbook_claimed_members_guard BEFORE UPDATE OF journey ON public.tripbook_journeys FOR EACH ROW EXECUTE FUNCTION public.tripbook_protect_claimed_members();
REVOKE ALL ON FUNCTION public.tripbook_roster(uuid), public.tripbook_claim_member(uuid,text), public.tripbook_choose_flight(uuid,text,boolean), public.tripbook_protect_claimed_members() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tripbook_roster(uuid), public.tripbook_claim_member(uuid,text), public.tripbook_choose_flight(uuid,text,boolean) TO authenticated;
