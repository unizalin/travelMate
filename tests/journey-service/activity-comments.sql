-- Local Supabase integration fixture for the journey staging RPCs.
-- Run with:
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f tests/journey-service/journey-rpc.sql
--
-- The fixture is transactional and deliberately uses synthetic local users.
-- It must never be run against a production database.

BEGIN;

DO $fixture$
DECLARE
  owner_id uuid := '00000000-0000-0000-0000-000000000101';
  member_id uuid := '00000000-0000-0000-0000-000000000102';
  outsider_id uuid := '00000000-0000-0000-0000-000000000103';
  editor_id uuid := '00000000-0000-0000-0000-000000000104';
BEGIN
  -- Supabase's local auth schema supplies defaults for the remaining auth
  -- columns.  ON CONFLICT keeps this fixture repeatable inside one database.
  INSERT INTO auth.users (id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data)
  VALUES
    (owner_id, 'authenticated', 'authenticated', 'journey-owner@example.test', '', '{}'::jsonb, '{}'::jsonb),
    (member_id, 'authenticated', 'authenticated', 'journey-member@example.test', '', '{}'::jsonb, '{}'::jsonb),
    (outsider_id, 'authenticated', 'authenticated', 'journey-outsider@example.test', '', '{}'::jsonb, '{}'::jsonb),
    (editor_id, 'authenticated', 'authenticated', 'journey-editor@example.test', '', '{}'::jsonb, '{}'::jsonb)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, display_name)
  VALUES
    (owner_id, 'Journey owner'),
    (member_id, 'Journey member'),
    (outsider_id, 'Journey outsider'),
    (editor_id, 'Journey editor')
  ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;
END;
$fixture$;

CREATE TEMP TABLE tripbook_test_created (envelope jsonb NOT NULL);
GRANT ALL ON tripbook_test_created TO authenticated;
GRANT SELECT ON tripbook_test_created TO anon;

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '00000000-0000-0000-0000-000000000101',
    'role', 'authenticated'
  )::text,
  true
);

INSERT INTO tripbook_test_created (envelope)
SELECT public.tripbook_create_journey(
  jsonb_build_object(
    'tripId', 'draft-local-fixture',
    'timeZone', 'Atlantic/Reykjavik',
    'startDate', '2026-10-30',
    'endDate', '2026-11-07',
    'name', 'Local journey fixture',
    'destination', 'Iceland',
    'members', jsonb_build_array(
      jsonb_build_object('id', 'member-1', 'tripId', 'draft-local-fixture', 'displayName', '', 'accountId', NULL),
      jsonb_build_object('id', 'member-2', 'tripId', 'draft-local-fixture', 'displayName', NULL, 'accountId', NULL)
    ),
    'groups', jsonb_build_array(
      jsonb_build_object('id', 'group-1', 'tripId', 'draft-local-fixture', 'name', 'All', 'memberIds', jsonb_build_array('member-1', 'member-2'), 'membershipConfirmed', false)
    ),
    'items', jsonb_build_array(
      jsonb_build_object('id', 'item-1', 'tripId', 'draft-local-fixture', 'date', '2026-10-30', 'name', 'Arrival', 'location', 'KEF', 'order', 0, 'plannedStart', NULL, 'plannedEnd', NULL, 'actualStart', NULL, 'actualEnd', NULL, 'status', 'planned', 'participation', jsonb_build_object('excludedMemberIds', jsonb_build_array()))
    ),
    'transports', jsonb_build_array(
      jsonb_build_object('id', 'transport-1', 'tripId', 'draft-local-fixture', 'kind', 'flight', 'name', 'BA802', 'departure', jsonb_build_object('location', 'LHR', 'localDate', '2026-10-30', 'localTime', '13:50', 'timeZone', 'Europe/London'), 'arrival', jsonb_build_object('location', 'KEF', 'localDate', '2026-10-30', 'localTime', '17:15', 'timeZone', 'Atlantic/Reykjavik'), 'participantIds', jsonb_build_array('member-1', 'member-2'), 'status', 'planned', 'actualStart', NULL, 'actualEnd', NULL)
    ),
    'accommodations', jsonb_build_array(
      jsonb_build_object('id', 'stay-1', 'tripId', 'draft-local-fixture', 'name', 'Reykjavik stay', 'checkIn', '2026-10-30', 'checkOut', '2026-11-01', 'participantIds', jsonb_build_array('member-1', 'member-2'), 'rooms', jsonb_build_array(jsonb_build_object('id', 'room-1', 'name', 'Room 1', 'memberIds', jsonb_build_array('member-1', 'member-2'))), 'benefits', jsonb_build_array('breakfast'))
    )
  )
);


DO $comments$
DECLARE
 trip uuid := (SELECT (envelope->>'tripId')::uuid FROM tripbook_test_created);
 first_comment jsonb;
 duplicate_comment jsonb;
 reply_comment jsonb;
 revision_before integer;
BEGIN
 SELECT revision INTO revision_before FROM public.tripbook_journeys WHERE trip_id=trip;
 first_comment := public.tripbook_post_comment(trip,'item-1','00000000-0000-0000-0000-000000000501','門口集合');
 duplicate_comment := public.tripbook_post_comment(trip,'item-1','00000000-0000-0000-0000-000000000501','門口集合');
 IF first_comment IS DISTINCT FROM duplicate_comment THEN RAISE EXCEPTION 'retry created a different comment'; END IF;
 IF first_comment->>'authorName' <> 'Journey owner' OR first_comment->>'createdAt' IS NULL THEN RAISE EXCEPTION 'missing server actor/time'; END IF;
 reply_comment := public.tripbook_post_comment(trip,'item-1','00000000-0000-0000-0000-000000000502','收到',(first_comment->>'id')::uuid);
 IF reply_comment->>'parentId' <> first_comment->>'id' THEN RAISE EXCEPTION 'reply parent lost'; END IF;
 IF jsonb_array_length(public.tripbook_list_comments(trip,'item-1'))<>2 THEN RAISE EXCEPTION 'expected two separate comments'; END IF;
 IF (SELECT revision FROM public.tripbook_journeys WHERE trip_id=trip)<>revision_before THEN RAISE EXCEPTION 'comments modified itinerary revision'; END IF;
 BEGIN
  PERFORM public.tripbook_post_comment(trip,'item-1','00000000-0000-0000-0000-000000000501','changed');
  RAISE EXCEPTION 'idempotency conflict accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'comment_request_conflict' THEN RAISE; END IF; END;
 BEGIN
  PERFORM public.tripbook_post_comment(trip,'item-1','00000000-0000-0000-0000-000000000503','nested',(reply_comment->>'id')::uuid);
  RAISE EXCEPTION 'nested reply accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'reply_not_found' THEN RAISE; END IF; END;
 BEGIN
  PERFORM public.tripbook_post_comment(trip,'missing','00000000-0000-0000-0000-000000000504','bad activity');
  RAISE EXCEPTION 'unknown activity accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'activity_not_found' THEN RAISE; END IF; END;
 BEGIN
  PERFORM public.tripbook_post_comment(trip,'item-1','00000000-0000-0000-0000-000000000505','   ');
  RAISE EXCEPTION 'empty message accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'comment_invalid' THEN RAISE; END IF; END;
 BEGIN
  PERFORM 1 FROM public.tripbook_activity_comments;
  RAISE EXCEPTION 'direct table access permitted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM public.tripbook_grant_journey_access(trip,'00000000-0000-0000-0000-000000000102','member');
 PERFORM set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000102","role":"authenticated"}',true);
 IF jsonb_array_length(public.tripbook_list_comments(trip,'item-1'))<>2 THEN RAISE EXCEPTION 'read-only member cannot read'; END IF;
 BEGIN
  PERFORM public.tripbook_post_comment(trip,'item-1','00000000-0000-0000-0000-000000000507','read-only');
  RAISE EXCEPTION 'read-only member posted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000103","role":"authenticated"}',true);
 BEGIN
  PERFORM public.tripbook_list_comments(trip,'item-1');
  RAISE EXCEPTION 'outsider read comments';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.tripbook_post_comment(trip,'item-1','00000000-0000-0000-0000-000000000506','outsider');
  RAISE EXCEPTION 'outsider posted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$comments$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $anonymous$
BEGIN
 BEGIN
  PERFORM public.tripbook_list_comments('00000000-0000-0000-0000-000000000999','item-1');
  RAISE EXCEPTION 'anon read comments';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$anonymous$;
ROLLBACK;
