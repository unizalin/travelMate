-- Return canonical identity names only to authorized members.
CREATE OR REPLACE FUNCTION public.tripbook_roster(p_trip_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, extensions AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.tripbook_can_read(p_trip_id) THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='journey_access_required';
  END IF;
  RETURN jsonb_build_object(
    'claims', COALESCE((SELECT jsonb_agg(jsonb_build_object('memberId', c.member_id, 'name', (SELECT m->>'displayName' FROM public.tripbook_journeys j, jsonb_array_elements(j.journey->'members') m WHERE j.trip_id=p_trip_id AND m->>'id'=c.member_id), 'isSelf', c.user_id = auth.uid())) FROM public.tripbook_member_claims c LEFT JOIN public.profiles p ON p.id=c.user_id WHERE c.trip_id=p_trip_id), '[]'::jsonb),
    'choices', COALESCE((SELECT jsonb_agg(jsonb_build_object('memberId', member_id, 'flightId', flight_id)) FROM public.tripbook_flight_choices WHERE trip_id=p_trip_id), '[]'::jsonb));
END;
$$;
