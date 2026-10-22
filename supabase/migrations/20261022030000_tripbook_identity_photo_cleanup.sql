-- A released identity must not transfer personal photo preferences to a new account.
CREATE OR REPLACE FUNCTION public.tripbook_remove_member(p_member_id text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, extensions AS $$
DECLARE v_trip uuid; v_owner uuid; v_user uuid;
BEGIN
 IF NOT public.tripbook_is_admin() THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='admin_required'; END IF;
 SELECT trip_id,owner_id INTO v_trip,v_owner FROM public.tripbook_fixed_journey FOR UPDATE;
 SELECT user_id INTO v_user FROM public.tripbook_member_claims WHERE trip_id=v_trip AND member_id=p_member_id;
 IF v_user=v_owner OR p_member_id='member-1' THEN RAISE EXCEPTION 'owner_identity_protected'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_trip::text || ':' || p_member_id,0));
 DELETE FROM public.tripbook_member_claims WHERE trip_id=v_trip AND member_id=p_member_id;
 DELETE FROM public.tripbook_member_photo_preferences WHERE trip_id=v_trip AND member_id=p_member_id;
 DELETE FROM public.tripbook_journey_access WHERE trip_id=v_trip AND user_id=v_user;
 DELETE FROM public.trip_members WHERE trip_id=v_trip AND user_id=v_user;
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
  IF NOT public.tripbook_photo_preferences_member(p_trip_id,p_member_id) THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='photo_preferences_forbidden'; END IF;
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
