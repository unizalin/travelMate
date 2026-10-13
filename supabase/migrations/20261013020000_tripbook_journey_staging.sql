-- TripBook journey staging layer.
--
-- This migration is additive.  It keeps the legacy Trip/itinerary/member
-- tables in place and stores one private, full-document draft per Trip.  The
-- document is deliberately a staging representation; the normalized journey
-- model can be introduced later without changing the public RPC contract.

CREATE TABLE IF NOT EXISTS public.tripbook_journeys (
  trip_id uuid PRIMARY KEY REFERENCES public.trips(id) ON DELETE CASCADE,
  -- This owner is fixed at create time.  Authorization never follows a
  -- mutable legacy trips.created_by value.
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  journey jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NOT NULL REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS tripbook_journeys_updated_at_idx
  ON public.tripbook_journeys (updated_at DESC);

ALTER TABLE public.tripbook_journeys ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.tripbook_journey_access (
  trip_id uuid NOT NULL REFERENCES public.tripbook_journeys(trip_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('editor', 'member')),
  granted_by uuid NOT NULL REFERENCES auth.users(id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (trip_id, user_id)
);

ALTER TABLE public.tripbook_journey_access ENABLE ROW LEVEL SECURITY;

-- The browser can read a row only through the private membership policy.  It
-- never receives table write privileges; all writes go through the validators
-- below.
REVOKE ALL ON TABLE public.tripbook_journeys FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.tripbook_journeys TO authenticated;
REVOKE ALL ON TABLE public.tripbook_journey_access FROM PUBLIC, anon, authenticated;

-- The owner is an immutable property of the private staging record.  In
-- particular, changing the legacy trips.created_by column must never transfer
-- access to this document.
CREATE OR REPLACE FUNCTION public.tripbook_prevent_owner_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, extensions
AS $function$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'journey_owner_immutable';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tripbook_journeys_owner_immutable
  ON public.tripbook_journeys;
CREATE TRIGGER tripbook_journeys_owner_immutable
  BEFORE UPDATE OF owner_id ON public.tripbook_journeys
  FOR EACH ROW
  EXECUTE FUNCTION public.tripbook_prevent_owner_change();

-- Rebuild the policy before replacing the helper surface.  The helpers
-- intentionally derive the subject from auth.uid() instead of accepting a
-- caller-selected user ID as an authorization argument.
DROP POLICY IF EXISTS tripbook_journeys_member_read
  ON public.tripbook_journeys;

CREATE OR REPLACE FUNCTION public.tripbook_member_role(
  p_trip_id uuid,
  p_user_id uuid
)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $function$
  SELECT access.role
  FROM public.tripbook_journey_access AS access
  WHERE access.trip_id = p_trip_id
    AND access.user_id = p_user_id
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.tripbook_can_read(
  p_trip_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.tripbook_journeys AS journey
      WHERE journey.trip_id = p_trip_id
        AND (
          journey.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.tripbook_journey_access AS access
            WHERE access.trip_id = journey.trip_id
              AND access.user_id = auth.uid()
              AND access.role IN ('editor', 'member')
          )
        )
    );
$function$;

CREATE OR REPLACE FUNCTION public.tripbook_can_edit(
  p_trip_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.tripbook_journeys AS journey
      WHERE journey.trip_id = p_trip_id
        AND (
          journey.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.tripbook_journey_access AS access
            WHERE access.trip_id = journey.trip_id
              AND access.user_id = auth.uid()
              AND access.role = 'editor'
          )
        )
    );
$function$;

DROP POLICY IF EXISTS tripbook_journeys_member_read
  ON public.tripbook_journeys;
CREATE POLICY tripbook_journeys_member_read
  ON public.tripbook_journeys
  FOR SELECT
  USING (public.tripbook_can_read(trip_id));

GRANT EXECUTE ON FUNCTION public.tripbook_can_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tripbook_can_edit(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.tripbook_member_role(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tripbook_can_read(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tripbook_can_edit(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tripbook_prevent_owner_change() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.tripbook_assert_date(
  p_value text,
  p_label text
)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, public, extensions
AS $function$
DECLARE
  v_date date;
BEGIN
  IF p_value IS NULL OR p_value !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'invalid_journey',
      DETAIL = format('%s must be an ISO date', p_label);
  END IF;

  BEGIN
    v_date := left(p_value, 10)::date;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'invalid_journey',
        DETAIL = format('%s is not a valid date', p_label);
  END;

  RETURN v_date;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tripbook_assert_stamp(
  p_value text,
  p_label text
)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, public, extensions
AS $function$
DECLARE
  v_stamp timestamptz;
BEGIN
  IF p_value IS NULL OR btrim(p_value) = '' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'invalid_journey',
      DETAIL = format('%s must be an ISO timestamp', p_label);
  END IF;

  BEGIN
    v_stamp := p_value::timestamptz;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'invalid_journey',
        DETAIL = format('%s is not a valid timestamp', p_label);
  END;

  IF v_stamp IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'invalid_journey',
      DETAIL = format('%s is not a valid timestamp', p_label);
  END IF;
END;
$function$;

-- PostgreSQL's AT TIME ZONE conversion picks one side of an overlap and
-- shifts through a spring gap.  Round-trip the wall clock and probe nearby
-- instants so the staging RPC rejects both ambiguous and nonexistent times.
CREATE OR REPLACE FUNCTION public.tripbook_assert_local_point(
  p_date text,
  p_time text,
  p_time_zone text,
  p_label text
)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public, extensions
AS $function$
DECLARE
  v_local timestamp without time zone;
  v_instant timestamptz;
  v_roundtrip timestamp without time zone;
  v_alternate timestamp without time zone;
  v_step integer;
BEGIN
  IF p_date IS NULL OR p_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
     OR p_time IS NULL OR p_time !~ '^[0-9]{2}:[0-9]{2}(:[0-9]{2})?$' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'invalid_journey',
      DETAIL = format('%s must contain a valid local date and time', p_label);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = p_time_zone) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'invalid_journey',
      DETAIL = format('%s has an invalid timezone', p_label);
  END IF;

  BEGIN
    v_local := (p_date || ' ' || p_time)::timestamp;
    v_instant := v_local AT TIME ZONE p_time_zone;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'invalid_journey',
        DETAIL = format('%s is not a valid local time', p_label);
  END;

  v_roundtrip := v_instant AT TIME ZONE p_time_zone;
  IF v_roundtrip <> v_local THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'invalid_journey',
      DETAIL = format('%s is a nonexistent local time', p_label);
  END IF;

  -- A second instant that renders to the same wall clock means the point is
  -- in a fall-back overlap.  Quarter-hour offsets cover current IANA zones
  -- while keeping validation bounded for a full journey document.
  FOR v_step IN -192..192 LOOP
    IF v_step <> 0 THEN
      v_alternate := (v_instant + v_step * interval '15 minutes') AT TIME ZONE p_time_zone;
      IF v_alternate = v_local THEN
        RAISE EXCEPTION USING
          ERRCODE = 'P0001',
          MESSAGE = 'invalid_journey',
          DETAIL = format('%s is an ambiguous local time', p_label);
      END IF;
    END IF;
  END LOOP;

  RETURN v_instant;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tripbook_assert_stamp_order(
  p_start text,
  p_end text,
  p_label text
)
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public, extensions
AS $function$
DECLARE
  v_start timestamptz;
  v_end timestamptz;
BEGIN
  IF p_start IS NULL OR p_end IS NULL THEN
    RETURN;
  END IF;

  BEGIN
    v_start := p_start::timestamptz;
    v_end := p_end::timestamptz;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'invalid_journey',
        DETAIL = format('%s contains an invalid timestamp pair', p_label);
  END;

  IF v_end < v_start THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'invalid_journey',
      DETAIL = format('%s end precedes start', p_label);
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tripbook_validate_id_array(
  p_values jsonb,
  p_allowed_ids jsonb,
  p_label text
)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, public, extensions
AS $function$
DECLARE
  v_value jsonb;
  v_id text;
BEGIN
  IF p_values IS NULL OR jsonb_typeof(p_values) <> 'array' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'invalid_journey',
      DETAIL = format('%s must be an array of member IDs', p_label);
  END IF;

  FOR v_value IN SELECT value FROM jsonb_array_elements(p_values) LOOP
    IF jsonb_typeof(v_value) <> 'string' THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'invalid_journey',
        DETAIL = format('%s contains a non-string member ID', p_label);
    END IF;

    v_id := v_value #>> '{}';
    IF btrim(v_id) = '' OR NOT (p_allowed_ids ? v_id) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'invalid_journey',
        DETAIL = format('%s references an unknown member ID', p_label);
    END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tripbook_validate_journey(
  p_journey jsonb,
  p_expected_trip_id text,
  p_require_uuid boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public, extensions
AS $function$
DECLARE
  v_root_trip_id text;
  v_root_uuid uuid;
  v_member jsonb;
  v_group jsonb;
  v_item jsonb;
  v_transport jsonb;
  v_accommodation jsonb;
  v_room jsonb;
  v_departure jsonb;
  v_arrival jsonb;
  v_member_ids jsonb := '[]'::jsonb;
  v_participant_ids jsonb;
  v_room_member_ids jsonb;
  v_id text;
  v_key text;
  v_mode text;
  v_status text;
  v_kind text;
  v_check_in date;
  v_check_out date;
  v_order numeric;
  v_departure_instant timestamptz;
  v_arrival_instant timestamptz;
BEGIN
  IF p_journey IS NULL OR jsonb_typeof(p_journey) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'journey must be a JSON object';
  END IF;

  IF jsonb_typeof(p_journey -> 'tripId') <> 'string' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'tripId is required';
  END IF;

  v_root_trip_id := p_journey ->> 'tripId';
  IF btrim(v_root_trip_id) = '' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'tripId cannot be empty';
  END IF;

  IF p_require_uuid THEN
    BEGIN
      v_root_uuid := v_root_trip_id::uuid;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'tripId must be a UUID when saving';
    END;

    IF v_root_uuid <> p_expected_trip_id::uuid THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'journey tripId does not match the requested Trip';
    END IF;
  ELSIF v_root_trip_id <> p_expected_trip_id THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'child IDs must use the same provisional Trip ID';
  END IF;

  IF jsonb_typeof(p_journey -> 'timeZone') <> 'string' OR btrim(p_journey ->> 'timeZone') = '' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'timeZone is required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = p_journey ->> 'timeZone') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'timeZone must be an IANA timezone';
  END IF;

  IF COALESCE(jsonb_typeof(p_journey -> 'members'), 'null') <> 'array'
     OR COALESCE(jsonb_typeof(p_journey -> 'groups'), 'null') <> 'array'
     OR COALESCE(jsonb_typeof(p_journey -> 'items'), 'null') <> 'array'
     OR COALESCE(jsonb_typeof(p_journey -> 'transports'), 'null') <> 'array'
     OR COALESCE(jsonb_typeof(p_journey -> 'accommodations'), 'null') <> 'array' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'members, groups, items, transports and accommodations must be arrays';
  END IF;
  IF jsonb_array_length(p_journey -> 'members') < 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'members must contain at least one member';
  END IF;

  IF p_journey ? 'startDate' AND jsonb_typeof(p_journey -> 'startDate') <> 'null' THEN
    PERFORM public.tripbook_assert_date(p_journey ->> 'startDate', 'startDate');
  END IF;
  IF p_journey ? 'endDate' AND jsonb_typeof(p_journey -> 'endDate') <> 'null' THEN
    PERFORM public.tripbook_assert_date(p_journey ->> 'endDate', 'endDate');
  END IF;

  -- The six roster slots are opaque IDs.  Account binding deliberately stays
  -- disabled until a verified claim flow exists.
  FOR v_member IN SELECT value FROM jsonb_array_elements(p_journey -> 'members') LOOP
    IF jsonb_typeof(v_member) <> 'object' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'members must contain objects';
    END IF;
    IF jsonb_typeof(v_member -> 'id') <> 'string' OR btrim(v_member ->> 'id') = '' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'member id is required';
    END IF;
    IF jsonb_typeof(v_member -> 'tripId') <> 'string' OR v_member ->> 'tripId' <> v_root_trip_id THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'member tripId does not match journey tripId';
    END IF;
    IF NOT (v_member ? 'displayName') OR jsonb_typeof(v_member -> 'displayName') NOT IN ('string', 'null') THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'member displayName must be text or null';
    END IF;
    IF NOT (v_member ? 'accountId') OR jsonb_typeof(v_member -> 'accountId') <> 'null' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'account_binding_unavailable', DETAIL = 'non-null accountId is not accepted by the staging layer';
    END IF;
    v_member_ids := v_member_ids || jsonb_build_array(v_member ->> 'id');
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT value #>> '{}' AS member_id
      FROM jsonb_array_elements(v_member_ids)
    ) AS duplicate_ids
    GROUP BY member_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'member IDs must be unique';
  END IF;

  FOR v_group IN SELECT value FROM jsonb_array_elements(p_journey -> 'groups') LOOP
    IF jsonb_typeof(v_group) <> 'object'
       OR jsonb_typeof(v_group -> 'id') <> 'string'
       OR btrim(v_group ->> 'id') = ''
       OR jsonb_typeof(v_group -> 'tripId') <> 'string'
       OR v_group ->> 'tripId' <> v_root_trip_id THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'group ID/tripId is invalid';
    END IF;
    IF jsonb_typeof(v_group -> 'name') <> 'string' OR btrim(v_group ->> 'name') = '' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'group name is required';
    END IF;
    IF jsonb_typeof(v_group -> 'membershipConfirmed') <> 'boolean' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'group membershipConfirmed is required';
    END IF;
    PERFORM public.tripbook_validate_id_array(v_group -> 'memberIds', v_member_ids, 'group memberIds');
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT value ->> 'id' AS item_id
      FROM jsonb_array_elements(p_journey -> 'groups')
    ) AS duplicate_ids
    GROUP BY item_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'group IDs must be unique';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_journey -> 'items') LOOP
    IF jsonb_typeof(v_item) <> 'object'
       OR jsonb_typeof(v_item -> 'id') <> 'string'
       OR btrim(v_item ->> 'id') = ''
       OR jsonb_typeof(v_item -> 'name') <> 'string'
       OR btrim(v_item ->> 'name') = '' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'item id/name is invalid';
    END IF;
    IF NOT (v_item ? 'location') OR jsonb_typeof(v_item -> 'location') NOT IN ('string', 'null') THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'item location is required';
    END IF;
    v_order := NULL;
    IF jsonb_typeof(v_item -> 'order') = 'number' THEN
      BEGIN
        v_order := (v_item ->> 'order')::numeric;
      EXCEPTION
        WHEN OTHERS THEN
          v_order := NULL;
      END;
    END IF;
    IF v_order IS NULL OR v_order < 0 OR v_order <> trunc(v_order) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'item order is invalid';
    END IF;
    PERFORM public.tripbook_assert_date(v_item ->> 'date', 'item date');
    IF v_item ? 'tripId' AND jsonb_typeof(v_item -> 'tripId') <> 'null' AND v_item ->> 'tripId' <> v_root_trip_id THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'item tripId does not match journey tripId';
    END IF;
    v_status := v_item ->> 'status';
    IF v_status IS NULL OR v_status NOT IN ('planned', 'next', 'completed', 'skipped', 'cancelled', 'fallback') THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'item status is invalid';
    END IF;
    FOREACH v_key IN ARRAY ARRAY['plannedStart', 'plannedEnd', 'actualStart', 'actualEnd'] LOOP
      IF NOT (v_item ? v_key) OR jsonb_typeof(v_item -> v_key) NOT IN ('string', 'null') THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'item planned/actual stamp is invalid';
      END IF;
      IF jsonb_typeof(v_item -> v_key) = 'string' THEN
        PERFORM public.tripbook_assert_stamp(v_item ->> v_key, 'item ' || v_key);
      END IF;
    END LOOP;
    PERFORM public.tripbook_assert_stamp_order(
      v_item ->> 'plannedStart',
      v_item ->> 'plannedEnd',
      'item planned interval'
    );
    PERFORM public.tripbook_assert_stamp_order(
      v_item ->> 'actualStart',
      v_item ->> 'actualEnd',
      'item actual interval'
    );

    IF jsonb_typeof(v_item -> 'participation') = 'string' THEN
      IF v_item ->> 'participation' <> 'all' THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'item participation is invalid';
      END IF;
    ELSIF jsonb_typeof(v_item -> 'participation') = 'array' THEN
      PERFORM public.tripbook_validate_id_array(v_item -> 'participation', v_member_ids, 'item participation');
    ELSIF jsonb_typeof(v_item -> 'participation') = 'object' THEN
      v_mode := v_item -> 'participation' ->> 'mode';
      IF v_mode IS NOT NULL AND v_mode NOT IN ('all', 'include', 'exclude') THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'item participation mode is invalid';
      END IF;
      IF v_mode IS DISTINCT FROM 'all'
         AND NOT EXISTS (
           SELECT 1
           FROM jsonb_object_keys(v_item -> 'participation') AS keys(key)
           WHERE keys.key IN ('memberIds', 'participantIds', 'includedMemberIds', 'excludedMemberIds')
         ) THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'item participation set is required';
      END IF;
      FOREACH v_key IN ARRAY ARRAY['memberIds', 'participantIds', 'includedMemberIds', 'excludedMemberIds'] LOOP
        IF (v_item -> 'participation') ? v_key THEN
          PERFORM public.tripbook_validate_id_array(v_item -> 'participation' -> v_key, v_member_ids, 'item participation ' || v_key);
        END IF;
      END LOOP;
    ELSIF v_item ? 'participation' AND jsonb_typeof(v_item -> 'participation') <> 'null' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'item participation is invalid';
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT value ->> 'id' AS item_id
      FROM jsonb_array_elements(p_journey -> 'items')
    ) AS duplicate_ids
    GROUP BY item_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'item IDs must be unique';
  END IF;

  FOR v_transport IN SELECT value FROM jsonb_array_elements(p_journey -> 'transports') LOOP
    IF jsonb_typeof(v_transport) <> 'object'
       OR jsonb_typeof(v_transport -> 'id') <> 'string'
       OR btrim(v_transport ->> 'id') = ''
       OR jsonb_typeof(v_transport -> 'tripId') <> 'string'
       OR v_transport ->> 'tripId' <> v_root_trip_id
       OR jsonb_typeof(v_transport -> 'name') <> 'string'
       OR btrim(v_transport ->> 'name') = '' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'transport id/name/tripId is invalid';
    END IF;
    v_kind := v_transport ->> 'kind';
    IF v_kind IS NULL OR v_kind NOT IN ('flight', 'train', 'bus', 'car', 'ferry', 'transfer', 'other') THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'transport kind is invalid';
    END IF;
    v_status := v_transport ->> 'status';
    IF v_status IS NULL OR v_status NOT IN ('planned', 'next', 'completed', 'skipped', 'cancelled', 'fallback') THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'transport status is invalid';
    END IF;
    v_departure := v_transport -> 'departure';
    v_arrival := v_transport -> 'arrival';
    IF jsonb_typeof(v_departure) <> 'object' OR jsonb_typeof(v_arrival) <> 'object' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'transport departure/arrival is required';
    END IF;
    v_departure_instant := NULL;
    v_arrival_instant := NULL;
    FOREACH v_key IN ARRAY ARRAY['departure', 'arrival'] LOOP
      IF jsonb_typeof(v_transport -> v_key -> 'location') <> 'string'
         OR btrim(v_transport -> v_key ->> 'location') = ''
         OR jsonb_typeof(v_transport -> v_key -> 'localDate') <> 'string'
         OR NOT (v_transport -> v_key ? 'localTime')
         OR jsonb_typeof(v_transport -> v_key -> 'localTime') NOT IN ('string', 'null')
         OR jsonb_typeof(v_transport -> v_key -> 'timeZone') <> 'string'
         OR btrim(v_transport -> v_key ->> 'timeZone') = '' THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'transport local schedule is invalid';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = v_transport -> v_key ->> 'timeZone') THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'transport timeZone must be an IANA timezone';
      END IF;
      PERFORM public.tripbook_assert_date(v_transport -> v_key ->> 'localDate', 'transport ' || v_key || ' localDate');
      IF (v_transport -> v_key ->> 'localTime') IS NOT NULL
         AND (v_transport -> v_key ->> 'localTime') !~ '^[0-9]{2}:[0-9]{2}(:[0-9]{2})?$' THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'transport localTime is invalid';
      END IF;
      IF (v_transport -> v_key ->> 'localTime') IS NOT NULL THEN
        IF v_key = 'departure' THEN
          v_departure_instant := public.tripbook_assert_local_point(
            v_transport -> v_key ->> 'localDate',
            v_transport -> v_key ->> 'localTime',
            v_transport -> v_key ->> 'timeZone',
            'transport departure'
          );
        ELSE
          v_arrival_instant := public.tripbook_assert_local_point(
            v_transport -> v_key ->> 'localDate',
            v_transport -> v_key ->> 'localTime',
            v_transport -> v_key ->> 'timeZone',
            'transport arrival'
          );
        END IF;
      END IF;
    END LOOP;
    IF v_departure_instant IS NOT NULL
       AND v_arrival_instant IS NOT NULL
       AND v_arrival_instant < v_departure_instant THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'transport arrival precedes departure';
    END IF;
    PERFORM public.tripbook_validate_id_array(v_transport -> 'participantIds', v_member_ids, 'transport participantIds');
    FOREACH v_key IN ARRAY ARRAY['actualStart', 'actualEnd'] LOOP
      IF NOT (v_transport ? v_key) OR jsonb_typeof(v_transport -> v_key) NOT IN ('string', 'null') THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'transport actual stamp is invalid';
      END IF;
      IF jsonb_typeof(v_transport -> v_key) = 'string' THEN
        PERFORM public.tripbook_assert_stamp(v_transport ->> v_key, 'transport ' || v_key);
      END IF;
    END LOOP;
    PERFORM public.tripbook_assert_stamp_order(
      v_transport ->> 'actualStart',
      v_transport ->> 'actualEnd',
      'transport actual interval'
    );
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT value ->> 'id' AS transport_id
      FROM jsonb_array_elements(p_journey -> 'transports')
    ) AS duplicate_ids
    GROUP BY transport_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'transport IDs must be unique';
  END IF;

  FOR v_accommodation IN SELECT value FROM jsonb_array_elements(p_journey -> 'accommodations') LOOP
    IF jsonb_typeof(v_accommodation) <> 'object'
       OR jsonb_typeof(v_accommodation -> 'id') <> 'string'
       OR btrim(v_accommodation ->> 'id') = ''
       OR jsonb_typeof(v_accommodation -> 'tripId') <> 'string'
       OR v_accommodation ->> 'tripId' <> v_root_trip_id
       OR jsonb_typeof(v_accommodation -> 'name') <> 'string'
       OR btrim(v_accommodation ->> 'name') = '' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'accommodation id/name/tripId is invalid';
    END IF;
    v_check_in := public.tripbook_assert_date(v_accommodation ->> 'checkIn', 'accommodation checkIn');
    v_check_out := public.tripbook_assert_date(v_accommodation ->> 'checkOut', 'accommodation checkOut');
    IF v_check_out <= v_check_in THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'accommodation checkOut must be after checkIn';
    END IF;
    PERFORM public.tripbook_validate_id_array(v_accommodation -> 'participantIds', v_member_ids, 'accommodation participantIds');
    IF COALESCE(jsonb_typeof(v_accommodation -> 'rooms'), 'null') <> 'array' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'accommodation rooms must be an array';
    END IF;
    v_participant_ids := v_accommodation -> 'participantIds';
    FOR v_room IN SELECT value FROM jsonb_array_elements(v_accommodation -> 'rooms') LOOP
      IF jsonb_typeof(v_room) <> 'object' THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'room must be an object';
      END IF;
      IF jsonb_typeof(v_room -> 'id') <> 'string' OR btrim(v_room ->> 'id') = ''
         OR jsonb_typeof(v_room -> 'name') <> 'string' OR btrim(v_room ->> 'name') = '' THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'room id/name is required';
      END IF;
      v_room_member_ids := COALESCE(v_room -> 'memberIds', v_room -> 'occupantIds', v_room -> 'participantIds');
      PERFORM public.tripbook_validate_id_array(v_room_member_ids, v_participant_ids, 'room memberIds');
    END LOOP;
    IF COALESCE(jsonb_typeof(v_accommodation -> 'benefits'), 'null') <> 'array' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'accommodation benefits must be an array';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_accommodation -> 'benefits') AS benefit(value)
      WHERE jsonb_typeof(benefit.value) <> 'string'
    ) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'accommodation benefits must contain strings';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM (
        SELECT value ->> 'id' AS room_id
        FROM jsonb_array_elements(v_accommodation -> 'rooms')
      ) AS duplicate_rooms
      GROUP BY room_id
      HAVING count(*) > 1
    ) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'room IDs must be unique';
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT value ->> 'id' AS accommodation_id
      FROM jsonb_array_elements(p_journey -> 'accommodations')
    ) AS duplicate_ids
    GROUP BY accommodation_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'accommodation IDs must be unique';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tripbook_remap_trip_ids(
  p_journey jsonb,
  p_trip_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, public, extensions
AS $function$
DECLARE
  v_result jsonb := jsonb_set(p_journey, '{tripId}', to_jsonb(p_trip_id::text), true);
  v_path text;
  v_values jsonb;
BEGIN
  FOREACH v_path IN ARRAY ARRAY['members', 'groups', 'items', 'transports', 'accommodations'] LOOP
    SELECT COALESCE(
      jsonb_agg(
        CASE
          WHEN v_path = 'items' AND NOT (value ? 'tripId') THEN value
          ELSE jsonb_set(value, '{tripId}', to_jsonb(p_trip_id::text), true)
        END
      ),
      '[]'::jsonb
    )
    INTO v_values
    FROM jsonb_array_elements(v_result -> v_path);
    v_result := jsonb_set(v_result, ARRAY[v_path], v_values, true);
  END LOOP;
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tripbook_derive_dates(p_journey jsonb)
RETURNS date[]
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, public, extensions
AS $function$
  SELECT ARRAY[
    MIN(day_value),
    MAX(day_value)
  ]::date[]
  FROM (
    SELECT left(value ->> 'date', 10)::date AS day_value
    FROM jsonb_array_elements(p_journey -> 'items')
    UNION ALL
    SELECT left(value -> 'departure' ->> 'localDate', 10)::date
    FROM jsonb_array_elements(p_journey -> 'transports')
    UNION ALL
    SELECT left(value -> 'arrival' ->> 'localDate', 10)::date
    FROM jsonb_array_elements(p_journey -> 'transports')
    UNION ALL
    SELECT left(value ->> 'checkIn', 10)::date
    FROM jsonb_array_elements(p_journey -> 'accommodations')
    UNION ALL
    SELECT left(value ->> 'checkOut', 10)::date
    FROM jsonb_array_elements(p_journey -> 'accommodations')
  ) AS dates;
$function$;

-- Empty display names carry the same meaning as an unknown name.  Normalize
-- them at the storage boundary while retaining the opaque Member ID.
CREATE OR REPLACE FUNCTION public.tripbook_normalize_journey(p_journey jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, public, extensions
AS $function$
DECLARE
  v_result jsonb := p_journey;
  v_members jsonb;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      CASE
        WHEN jsonb_typeof(value -> 'displayName') = 'string'
             AND btrim(value ->> 'displayName') = ''
          THEN jsonb_set(value, '{displayName}', 'null'::jsonb, true)
        ELSE value
      END
    ),
    '[]'::jsonb
  )
  INTO v_members
  FROM jsonb_array_elements(p_journey -> 'members');

  RETURN jsonb_set(v_result, '{members}', v_members, true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.tripbook_journey_envelope(p_trip_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $function$
  SELECT jsonb_build_object(
    'tripId', j.trip_id::text,
    'revision', j.revision,
    'journey', j.journey,
    'canEdit', public.tripbook_can_edit(j.trip_id),
    'updatedAt', j.updated_at
  )
  FROM public.tripbook_journeys AS j
  WHERE j.trip_id = p_trip_id;
$function$;

CREATE OR REPLACE FUNCTION public.tripbook_create_journey(p_journey jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_trip_id uuid;
  v_journey jsonb;
  v_dates date[];
  v_start_date date;
  v_end_date date;
  v_name text;
  v_destination text;
  v_updated_at timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'not_authenticated';
  END IF;

  PERFORM public.tripbook_validate_journey(p_journey, p_journey ->> 'tripId', false);
  p_journey := public.tripbook_normalize_journey(p_journey);
  v_trip_id := gen_random_uuid();
  v_journey := public.tripbook_remap_trip_ids(p_journey, v_trip_id);
  v_dates := public.tripbook_derive_dates(v_journey);
  v_start_date := NULLIF(left(p_journey ->> 'startDate', 10), '')::date;
  v_end_date := NULLIF(left(p_journey ->> 'endDate', 10), '')::date;
  IF v_start_date IS NULL THEN
    v_start_date := COALESCE(v_dates[1], current_date);
  END IF;
  IF v_end_date IS NULL THEN
    v_end_date := COALESCE(v_dates[2], v_start_date);
  END IF;
  IF v_end_date < v_start_date THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'endDate must be on or after startDate';
  END IF;

  v_name := COALESCE(NULLIF(btrim(p_journey ->> 'name'), ''), 'TripBook journey');
  v_destination := COALESCE(NULLIF(btrim(p_journey ->> 'destination'), ''), 'Iceland');

  -- The profile initializer is safe for an existing account and keeps the
  -- legacy trips.created_by foreign key valid inside this same transaction.
  INSERT INTO public.profiles (id)
  VALUES (v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- Use the UUID already embedded in the remapped document so the legacy Trip
  -- and every staged child reference are created atomically with one ID.
  INSERT INTO public.trips (id, name, destination, start_date, end_date, created_by)
  VALUES (v_trip_id, v_name, v_destination, v_start_date, v_end_date, v_user_id)
  RETURNING id INTO v_trip_id;

  INSERT INTO public.trip_members (trip_id, user_id, role)
  VALUES (v_trip_id, v_user_id, 'organizer');

  INSERT INTO public.tripbook_journeys (trip_id, owner_id, revision, journey, updated_by)
  VALUES (v_trip_id, v_user_id, 1, v_journey, v_user_id)
  RETURNING updated_at INTO v_updated_at;

  RETURN jsonb_build_object(
    'tripId', v_trip_id::text,
    'revision', 1,
    'journey', v_journey,
    'canEdit', true,
    'updatedAt', v_updated_at
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.tripbook_load_journey(p_trip_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_envelope jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'not_authenticated';
  END IF;
  IF NOT public.tripbook_can_read(p_trip_id) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'journey_not_found';
  END IF;

  v_envelope := public.tripbook_journey_envelope(p_trip_id);
  IF v_envelope IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'journey_not_found';
  END IF;
  RETURN v_envelope;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tripbook_save_journey(
  p_trip_id uuid,
  p_expected_revision integer,
  p_journey jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_updated_rows integer;
  v_journey jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'not_authenticated';
  END IF;
  IF p_expected_revision IS NULL OR p_expected_revision < 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_revision';
  END IF;
  IF NOT public.tripbook_can_edit(p_trip_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'journey_read_only';
  END IF;

  PERFORM public.tripbook_validate_journey(p_journey, p_trip_id::text, true);
  v_journey := public.tripbook_normalize_journey(p_journey);

  UPDATE public.tripbook_journeys AS j
  SET journey = v_journey,
      revision = j.revision + 1,
      updated_at = now(),
      updated_by = v_user_id
  WHERE j.trip_id = p_trip_id
    AND j.revision = p_expected_revision;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
  IF v_updated_rows = 0 THEN
    IF EXISTS (SELECT 1 FROM public.tripbook_journeys AS j WHERE j.trip_id = p_trip_id) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'journey_conflict',
        DETAIL = 'expected revision is stale; reload before saving';
    END IF;
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'journey_not_found';
  END IF;

  RETURN public.tripbook_journey_envelope(p_trip_id);
END;
$function$;

-- Access is granted through this owner-only RPC.  The legacy trip_members
-- table remains available to the existing application, but it is deliberately
-- not an authority for this private staging document.
CREATE OR REPLACE FUNCTION public.tripbook_grant_journey_access(
  p_trip_id uuid,
  p_user_id uuid,
  p_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $function$
DECLARE
  v_owner_id uuid := auth.uid();
BEGIN
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'not_authenticated';
  END IF;
  IF p_user_id IS NULL OR p_user_id = v_owner_id THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'invalid_access',
      DETAIL = 'an access grant requires another authenticated account';
  END IF;
  IF p_role IS NULL OR p_role NOT IN ('editor', 'member') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'invalid_access',
      DETAIL = 'role must be editor or member';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users AS target WHERE target.id = p_user_id) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'invalid_access',
      DETAIL = 'target account does not exist';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.tripbook_journeys AS journey
    WHERE journey.trip_id = p_trip_id
      AND journey.owner_id = v_owner_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'journey_forbidden';
  END IF;

  INSERT INTO public.tripbook_journey_access (trip_id, user_id, role, granted_by)
  VALUES (p_trip_id, p_user_id, p_role, v_owner_id)
  ON CONFLICT (trip_id, user_id) DO UPDATE
    SET role = EXCLUDED.role,
        granted_by = EXCLUDED.granted_by,
        granted_at = now();

  RETURN jsonb_build_object(
    'tripId', p_trip_id::text,
    'userId', p_user_id::text,
    'role', p_role
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.tripbook_assert_date(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tripbook_assert_stamp(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tripbook_assert_local_point(text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tripbook_assert_stamp_order(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tripbook_validate_id_array(jsonb, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tripbook_validate_journey(jsonb, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tripbook_remap_trip_ids(jsonb, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tripbook_derive_dates(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tripbook_normalize_journey(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tripbook_journey_envelope(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tripbook_grant_journey_access(uuid, uuid, text) FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.tripbook_create_journey(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tripbook_load_journey(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tripbook_save_journey(uuid, integer, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tripbook_create_journey(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tripbook_load_journey(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tripbook_save_journey(uuid, integer, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tripbook_grant_journey_access(uuid, uuid, text) TO authenticated;

-- A prior local iteration briefly exposed two-argument helpers.  Revoke that
-- overload when it exists, while keeping this migration safe on a clean DB
-- where the overload has never been created.
DO $function$
BEGIN
  IF to_regprocedure('public.tripbook_can_read(uuid, uuid)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.tripbook_can_read(uuid, uuid) FROM PUBLIC, anon, authenticated';
  END IF;
  IF to_regprocedure('public.tripbook_can_edit(uuid, uuid)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.tripbook_can_edit(uuid, uuid) FROM PUBLIC, anon, authenticated';
  END IF;
END;
$function$;
