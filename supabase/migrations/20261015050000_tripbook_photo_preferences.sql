-- Private per-member photography preferences. Shared photo spots stay in the
-- existing journey JSON and are therefore protected by its CAS validator.
CREATE TABLE IF NOT EXISTS public.tripbook_member_photo_preferences (
  trip_id uuid NOT NULL REFERENCES public.tripbook_journeys(trip_id) ON DELETE CASCADE,
  member_id text NOT NULL,
  show_photography boolean NOT NULL DEFAULT true,
  phone_spot_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  camera_spot_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (trip_id, member_id),
  CONSTRAINT tripbook_photo_phone_ids_array CHECK (jsonb_typeof(phone_spot_ids) = 'array'),
  CONSTRAINT tripbook_photo_camera_ids_array CHECK (jsonb_typeof(camera_spot_ids) = 'array')
);

ALTER TABLE public.tripbook_member_photo_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.tripbook_member_photo_preferences FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.tripbook_photo_preferences_member(
  p_trip_id uuid,
  p_member_id text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
  SELECT auth.uid() IS NOT NULL
    AND public.tripbook_can_read(p_trip_id)
    AND EXISTS (
      SELECT 1 FROM public.tripbook_member_claims claim
      WHERE claim.trip_id = p_trip_id
        AND claim.member_id = p_member_id
        AND claim.user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.tripbook_photo_preferences_valid_ids(p_ids jsonb)
RETURNS boolean
LANGUAGE sql IMMUTABLE
SET search_path = pg_catalog, public, extensions
AS $$
  SELECT jsonb_typeof(p_ids) = 'array'
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_ids) value
      WHERE jsonb_typeof(value) <> 'string' OR btrim(value #>> '{}') = ''
    );
$$;

DROP POLICY IF EXISTS tripbook_photo_preferences_member_read ON public.tripbook_member_photo_preferences;
CREATE POLICY tripbook_photo_preferences_member_read
  ON public.tripbook_member_photo_preferences FOR SELECT TO authenticated
  USING (public.tripbook_photo_preferences_member(trip_id, member_id));

CREATE OR REPLACE FUNCTION public.tripbook_load_photo_preferences(
  p_trip_id uuid,
  p_member_id text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE v_row public.tripbook_member_photo_preferences;
BEGIN
  IF NOT public.tripbook_photo_preferences_member(p_trip_id, p_member_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'photo_preferences_forbidden';
  END IF;
  SELECT * INTO v_row FROM public.tripbook_member_photo_preferences WHERE trip_id = p_trip_id AND member_id = p_member_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('tripId', p_trip_id::text, 'memberId', p_member_id, 'showPhotography', true, 'phoneSpotIds', '[]'::jsonb, 'cameraSpotIds', '[]'::jsonb, 'updatedAt', NULL);
  END IF;
  RETURN jsonb_build_object('tripId', v_row.trip_id::text, 'memberId', v_row.member_id, 'showPhotography', v_row.show_photography, 'phoneSpotIds', v_row.phone_spot_ids, 'cameraSpotIds', v_row.camera_spot_ids, 'updatedAt', v_row.updated_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.tripbook_save_photo_preferences(
  p_trip_id uuid,
  p_member_id text,
  p_show_photography boolean,
  p_phone_spot_ids jsonb,
  p_camera_spot_ids jsonb,
  p_expected_updated_at timestamptz DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE v_row public.tripbook_member_photo_preferences;
BEGIN
  IF NOT public.tripbook_photo_preferences_member(p_trip_id, p_member_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'photo_preferences_forbidden';
  END IF;
  IF p_show_photography IS NULL OR NOT public.tripbook_photo_preferences_valid_ids(p_phone_spot_ids) OR NOT public.tripbook_photo_preferences_valid_ids(p_camera_spot_ids) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_photo_preferences';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_trip_id::text || ':' || p_member_id, 0));
  SELECT * INTO v_row FROM public.tripbook_member_photo_preferences WHERE trip_id = p_trip_id AND member_id = p_member_id FOR UPDATE;
  IF (FOUND AND v_row.updated_at IS DISTINCT FROM p_expected_updated_at)
     OR (NOT FOUND AND p_expected_updated_at IS NOT NULL) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'photo_preferences_conflict';
  END IF;
  INSERT INTO public.tripbook_member_photo_preferences(trip_id, member_id, show_photography, phone_spot_ids, camera_spot_ids)
  VALUES (p_trip_id, p_member_id, p_show_photography, p_phone_spot_ids, p_camera_spot_ids)
  ON CONFLICT (trip_id, member_id) DO UPDATE SET show_photography = excluded.show_photography, phone_spot_ids = excluded.phone_spot_ids, camera_spot_ids = excluded.camera_spot_ids, updated_at = now()
  RETURNING * INTO v_row;
  RETURN jsonb_build_object('tripId', v_row.trip_id::text, 'memberId', v_row.member_id, 'showPhotography', v_row.show_photography, 'phoneSpotIds', v_row.phone_spot_ids, 'cameraSpotIds', v_row.camera_spot_ids, 'updatedAt', v_row.updated_at);
END;
$$;

REVOKE ALL ON FUNCTION public.tripbook_load_photo_preferences(uuid, text), public.tripbook_save_photo_preferences(uuid, text, boolean, jsonb, jsonb, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tripbook_load_photo_preferences(uuid, text), public.tripbook_save_photo_preferences(uuid, text, boolean, jsonb, jsonb, timestamptz) TO authenticated;
