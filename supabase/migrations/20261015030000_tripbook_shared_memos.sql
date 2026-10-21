-- Shared, server-stamped activity memos for the private journey staging document.
-- This migration is additive and is intended for the local Supabase project only.

CREATE OR REPLACE FUNCTION public.tripbook_validate_memos(p_journey jsonb)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, public, extensions
AS $function$
DECLARE
  v_activity_id text;
  v_memo jsonb;
BEGIN
  IF NOT (p_journey ? 'memos') THEN RETURN; END IF;
  IF jsonb_typeof(p_journey -> 'memos') <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'memos must be an object';
  END IF;
  FOR v_activity_id, v_memo IN SELECT key, value FROM jsonb_each(p_journey -> 'memos') LOOP
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_journey -> 'items') AS item(value)
      WHERE item.value ->> 'id' = v_activity_id
    ) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'memo references an unknown activity';
    END IF;
    IF jsonb_typeof(v_memo) IS DISTINCT FROM 'object'
       OR jsonb_typeof(v_memo -> 'content') IS DISTINCT FROM 'string' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'memo content must be text';
    END IF;
    IF char_length(v_memo ->> 'content') > 2000 THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'memo content exceeds 2000 characters';
    END IF;
  END LOOP;
END;
$function$;

-- Replacing this helper keeps client supplied actor/time metadata out of new
-- journey records. Existing server memos are reattached by save RPC below.
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
  PERFORM public.tripbook_validate_memos(p_journey);
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

  -- New journey creation does not have a server stamped memo revision yet.
  -- The client submits the journey without memos and syncs pending drafts after
  -- creation; direct callers therefore cannot create unstamped memo records.
  v_result := jsonb_set(v_result, '{memos}', '{}'::jsonb, true);
  RETURN jsonb_set(v_result, '{members}', v_members, true);
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
  v_current_revision integer;
  v_current_journey jsonb;
  v_journey jsonb;
  v_preserved_memos jsonb := '{}'::jsonb;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'not_authenticated'; END IF;
  IF p_expected_revision IS NULL OR p_expected_revision < 1 THEN RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_revision'; END IF;
  IF NOT public.tripbook_can_edit(p_trip_id) THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'journey_read_only'; END IF;

  PERFORM public.tripbook_validate_journey(p_journey - 'memos', p_trip_id::text, true);
  SELECT revision, journey INTO v_current_revision, v_current_journey
  FROM public.tripbook_journeys WHERE trip_id = p_trip_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'journey_not_found'; END IF;
  IF v_current_revision <> p_expected_revision THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'journey_conflict', DETAIL = 'expected revision is stale; reload before saving';
  END IF;

  SELECT COALESCE(jsonb_object_agg(memo.key, memo.value), '{}'::jsonb)
  INTO v_preserved_memos
  FROM jsonb_each(COALESCE(v_current_journey -> 'memos', '{}'::jsonb)) AS memo(key, value)
  WHERE EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_journey -> 'items') AS item(value)
    WHERE item.value ->> 'id' = memo.key
  );
  v_journey := jsonb_set(public.tripbook_normalize_journey(p_journey), '{memos}', v_preserved_memos, true);

  UPDATE public.tripbook_journeys
  SET journey = v_journey, revision = revision + 1, updated_at = now(), updated_by = v_user_id
  WHERE trip_id = p_trip_id AND revision = p_expected_revision;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'journey_conflict'; END IF;
  RETURN public.tripbook_journey_envelope(p_trip_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.tripbook_save_journey_memo(
  p_trip_id uuid,
  p_expected_revision integer,
  p_activity_id text,
  p_content text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_revision integer;
  v_journey jsonb;
  v_memos jsonb;
  v_actor_name text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'not_authenticated'; END IF;
  IF p_expected_revision IS NULL OR p_expected_revision < 1 THEN RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_revision'; END IF;
  IF NOT public.tripbook_can_edit(p_trip_id) THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'journey_read_only'; END IF;
  IF p_activity_id IS NULL OR btrim(p_activity_id) = '' OR p_content IS NULL OR char_length(p_content) > 2000 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'memo activity and content are invalid';
  END IF;

  SELECT revision, journey INTO v_revision, v_journey
  FROM public.tripbook_journeys WHERE trip_id = p_trip_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'journey_not_found'; END IF;
  IF v_revision <> p_expected_revision THEN RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'journey_conflict'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_journey -> 'items') AS item(value)
    WHERE item.value ->> 'id' = p_activity_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_journey', DETAIL = 'memo references an unknown activity';
  END IF;

  v_memos := COALESCE(v_journey -> 'memos', '{}'::jsonb);
  IF p_content = '' THEN
    v_memos := v_memos - p_activity_id;
  ELSE
    SELECT NULLIF(btrim(display_name), '') INTO v_actor_name
    FROM public.profiles WHERE id = v_user_id;
    v_memos := jsonb_set(v_memos, ARRAY[p_activity_id], jsonb_build_object(
      'content', p_content,
      'updatedBy', v_user_id::text,
      'updatedByName', v_actor_name,
      'updatedAt', clock_timestamp()
    ), true);
  END IF;
  v_journey := jsonb_set(v_journey, '{memos}', v_memos, true);

  UPDATE public.tripbook_journeys
  SET journey = v_journey, revision = revision + 1, updated_at = now(), updated_by = v_user_id
  WHERE trip_id = p_trip_id AND revision = p_expected_revision;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'journey_conflict'; END IF;
  RETURN public.tripbook_journey_envelope(p_trip_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.tripbook_validate_memos(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tripbook_save_journey_memo(uuid, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tripbook_save_journey_memo(uuid, integer, text, text) TO authenticated;
