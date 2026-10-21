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

DO $assert_create$
DECLARE
  envelope jsonb;
  created_trip uuid;
BEGIN
  SELECT tc.envelope INTO envelope FROM tripbook_test_created AS tc;
  created_trip := (envelope ->> 'tripId')::uuid;
  IF created_trip IS NULL OR envelope ->> 'tripId' = 'draft-local-fixture' OR (envelope ->> 'revision')::integer <> 1 THEN
    RAISE EXCEPTION 'create did not remap provisional ID and start at revision 1';
  END IF;
  IF (envelope -> 'journey' ->> 'tripId') <> (envelope ->> 'tripId') THEN
    RAISE EXCEPTION 'created journey root tripId was not remapped';
  END IF;
  IF (envelope -> 'journey' -> 'items' -> 0 ->> 'tripId') <> (envelope ->> 'tripId') THEN
    RAISE EXCEPTION 'created item tripId was not remapped';
  END IF;
  IF (envelope -> 'journey' -> 'members' -> 0 -> 'displayName') IS DISTINCT FROM 'null'::jsonb
     OR (envelope -> 'journey' -> 'members' -> 1 -> 'displayName') IS DISTINCT FROM 'null'::jsonb THEN
    RAISE EXCEPTION 'unknown member names were not normalized to null';
  END IF;
END;
$assert_create$;

RESET ROLE;
INSERT INTO public.trip_members (trip_id, user_id, role)
SELECT (envelope ->> 'tripId')::uuid, '00000000-0000-0000-0000-000000000102'::uuid, 'member'
FROM tripbook_test_created;
INSERT INTO public.trip_members (trip_id, user_id, role)
SELECT (envelope ->> 'tripId')::uuid, '00000000-0000-0000-0000-000000000103'::uuid, 'organizer'
FROM tripbook_test_created;

-- Legacy membership is intentionally insufficient for the private journey.
-- The owner must grant access through the dedicated owner-only RPC.
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  jsonb_build_object('sub', '00000000-0000-0000-0000-000000000103', 'role', 'authenticated')::text,
  true
);
DO $assert_forged_grant$
BEGIN
  BEGIN
    PERFORM public.tripbook_grant_journey_access(
      (envelope ->> 'tripId')::uuid,
      '00000000-0000-0000-0000-000000000102'::uuid,
      'editor'
    )
    FROM tripbook_test_created AS envelope;
    RAISE EXCEPTION 'legacy organizer unexpectedly granted private access';
  EXCEPTION
    WHEN OTHERS THEN
      IF position('journey_forbidden' IN SQLERRM) = 0 THEN RAISE; END IF;
  END;
END;
$assert_forged_grant$;

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  jsonb_build_object('sub', '00000000-0000-0000-0000-000000000101', 'role', 'authenticated')::text,
  true
);
SELECT public.tripbook_grant_journey_access(
  (envelope ->> 'tripId')::uuid,
  '00000000-0000-0000-0000-000000000102'::uuid,
  'member'
)
FROM tripbook_test_created AS envelope;

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  jsonb_build_object('sub', '00000000-0000-0000-0000-000000000102', 'role', 'authenticated')::text,
  true
);

DO $assert_member_read$
DECLARE
  loaded jsonb;
  visible_rows integer;
BEGIN
  SELECT public.tripbook_load_journey((envelope ->> 'tripId')::uuid)
  INTO loaded
  FROM tripbook_test_created;
  IF (loaded ->> 'canEdit')::boolean THEN
    RAISE EXCEPTION 'legacy member unexpectedly received edit permission';
  END IF;
  SELECT count(*) INTO visible_rows
  FROM public.tripbook_journeys AS journey
  WHERE journey.trip_id = (SELECT (envelope ->> 'tripId')::uuid FROM tripbook_test_created);
  IF visible_rows <> 1 THEN
    RAISE EXCEPTION 'authorized member could not read the private journey through RLS';
  END IF;
END;
$assert_member_read$;

DO $assert_member_memo_read_only$
BEGIN
  BEGIN
    PERFORM public.tripbook_save_journey_memo(
      (envelope ->> 'tripId')::uuid,
      1,
      'item-1',
      'member cannot write this shared memo'
    ) FROM tripbook_test_created AS envelope;
    RAISE EXCEPTION 'read-only member unexpectedly saved a shared memo';
  EXCEPTION
    WHEN OTHERS THEN
      IF position('journey_read_only' IN SQLERRM) = 0 THEN RAISE; END IF;
  END;
END;
$assert_member_memo_read_only$;

DO $assert_direct_write$
BEGIN
  BEGIN
    INSERT INTO public.tripbook_journeys (trip_id, owner_id, revision, journey, updated_by)
    SELECT (envelope ->> 'tripId')::uuid, auth.uid(), 9, envelope -> 'journey', auth.uid()
    FROM tripbook_test_created;
    RAISE EXCEPTION 'direct table write unexpectedly succeeded';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END;
$assert_direct_write$;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  jsonb_build_object('sub', '00000000-0000-0000-0000-000000000103', 'role', 'authenticated')::text,
  true
);

DO $assert_forged_legacy_member$
DECLARE
  created jsonb;
BEGIN
  SELECT envelope INTO created FROM tripbook_test_created;
  BEGIN
    PERFORM public.tripbook_load_journey((created ->> 'tripId')::uuid);
    RAISE EXCEPTION 'legacy organizer unexpectedly loaded the private journey';
  EXCEPTION
    WHEN OTHERS THEN
      IF position('journey_not_found' IN SQLERRM) = 0 THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.tripbook_save_journey(
      (created ->> 'tripId')::uuid,
      1,
      created -> 'journey'
    );
    RAISE EXCEPTION 'legacy organizer unexpectedly saved the private journey';
  EXCEPTION
    WHEN OTHERS THEN
      IF position('journey_read_only' IN SQLERRM) = 0 THEN RAISE; END IF;
  END;
END;
$assert_forged_legacy_member$;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  jsonb_build_object('sub', '00000000-0000-0000-0000-000000000101', 'role', 'authenticated')::text,
  true
);

SELECT public.tripbook_grant_journey_access(
  (envelope ->> 'tripId')::uuid,
  '00000000-0000-0000-0000-000000000104'::uuid,
  'editor'
)
FROM tripbook_test_created AS envelope;

DO $assert_owner_cas$
DECLARE
  created jsonb;
  saved jsonb;
BEGIN
  SELECT envelope INTO created FROM tripbook_test_created;
  saved := public.tripbook_save_journey(
    (created ->> 'tripId')::uuid,
    1,
    created -> 'journey'
  );
  IF (saved ->> 'revision')::integer <> 2 THEN
    RAISE EXCEPTION 'CAS save did not increment revision';
  END IF;
END;
$assert_owner_cas$;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  jsonb_build_object('sub', '00000000-0000-0000-0000-000000000104', 'role', 'authenticated')::text,
  true
);

DO $assert_editor_write$
DECLARE
  created jsonb;
  loaded jsonb;
  saved jsonb;
BEGIN
  SELECT envelope INTO created FROM tripbook_test_created;
  loaded := public.tripbook_load_journey((created ->> 'tripId')::uuid);
  IF NOT (loaded ->> 'canEdit')::boolean THEN
    RAISE EXCEPTION 'granted editor did not receive edit permission';
  END IF;
  saved := public.tripbook_save_journey(
    (created ->> 'tripId')::uuid,
    2,
    created -> 'journey'
  );
  IF (saved ->> 'revision')::integer <> 3 THEN
    RAISE EXCEPTION 'editor CAS save did not increment revision';
  END IF;
END;
$assert_editor_write$;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  jsonb_build_object('sub', '00000000-0000-0000-0000-000000000101', 'role', 'authenticated')::text,
  true
);

DO $assert_cas$
DECLARE
  created jsonb;
BEGIN
  SELECT envelope INTO created FROM tripbook_test_created;

  BEGIN
    PERFORM public.tripbook_save_journey(
      (created ->> 'tripId')::uuid,
      2,
      created -> 'journey'
    );
    RAISE EXCEPTION 'stale CAS save unexpectedly succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      IF position('journey_conflict' IN SQLERRM) = 0 THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.tripbook_save_journey(
      (created ->> 'tripId')::uuid,
      3,
      jsonb_set(created -> 'journey', '{members,0,id}', '"foreign-member"'::jsonb)
    );
    RAISE EXCEPTION 'foreign participant unexpectedly succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      IF position('invalid_journey' IN SQLERRM) = 0 THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.tripbook_save_journey(
      (created ->> 'tripId')::uuid,
      3,
      jsonb_set(created -> 'journey', '{members,0,accountId}', '"forged-account"'::jsonb)
    );
    RAISE EXCEPTION 'non-null account binding unexpectedly succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      IF position('account_binding_unavailable' IN SQLERRM) = 0 THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.tripbook_save_journey(
      (created ->> 'tripId')::uuid,
      3,
      jsonb_set(created -> 'journey', '{items,0}', '{"id":"broken"}'::jsonb)
    );
    RAISE EXCEPTION 'malformed item unexpectedly succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      IF position('invalid_journey' IN SQLERRM) = 0 THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.tripbook_save_journey(
      (created ->> 'tripId')::uuid,
      3,
      (created -> 'journey') #- '{transports,0,departure,localTime}'
    );
    RAISE EXCEPTION 'transport localTime missing required key unexpectedly succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      IF position('invalid_journey' IN SQLERRM) = 0 THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.tripbook_save_journey(
      (created ->> 'tripId')::uuid,
      3,
      jsonb_set(
        jsonb_set(created -> 'journey', '{transports,0,departure,localDate}', '"2026-03-29"'::jsonb),
        '{transports,0,departure,localTime}', '"01:30"'::jsonb
      )
    );
    RAISE EXCEPTION 'nonexistent DST local time unexpectedly succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      IF position('invalid_journey' IN SQLERRM) = 0 THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.tripbook_save_journey(
      (created ->> 'tripId')::uuid,
      3,
      jsonb_set(
        jsonb_set(created -> 'journey', '{transports,0,departure,localDate}', '"2026-10-25"'::jsonb),
        '{transports,0,departure,localTime}', '"01:30"'::jsonb
      )
    );
    RAISE EXCEPTION 'ambiguous DST local time unexpectedly succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      IF position('invalid_journey' IN SQLERRM) = 0 THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.tripbook_save_journey(
      (created ->> 'tripId')::uuid,
      3,
      jsonb_set(
        jsonb_set(created -> 'journey', '{transports,0,arrival,localDate}', '"2026-10-30"'::jsonb),
        '{transports,0,arrival,localTime}', '"10:00"'::jsonb
      )
    );
    RAISE EXCEPTION 'reversed transport interval unexpectedly succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      IF position('invalid_journey' IN SQLERRM) = 0 THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.tripbook_save_journey(
      (created ->> 'tripId')::uuid,
      3,
      jsonb_set(
        jsonb_set(created -> 'journey', '{items,0,plannedStart}', '"2026-10-30T12:00:00Z"'::jsonb),
        '{items,0,plannedEnd}', '"2026-10-30T11:00:00Z"'::jsonb
      )
    );
    RAISE EXCEPTION 'reversed planned interval unexpectedly succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      IF position('invalid_journey' IN SQLERRM) = 0 THEN RAISE; END IF;
  END;
END;
$assert_cas$;

DO $assert_shared_memo_server_stamp$
DECLARE
  preserved jsonb;
  created jsonb;
  saved jsonb;
  memo jsonb;
BEGIN
  SELECT envelope INTO created FROM tripbook_test_created;
  saved := public.tripbook_save_journey_memo(
    (created ->> 'tripId')::uuid,
    3,
    'item-1',
    '集合前確認冰爪與雨衣'
  );
  memo := saved -> 'journey' -> 'memos' -> 'item-1';
  IF (saved ->> 'revision')::integer <> 4 THEN RAISE EXCEPTION 'memo CAS did not increment revision'; END IF;
  IF memo ->> 'content' <> '集合前確認冰爪與雨衣' THEN RAISE EXCEPTION 'memo content was not saved'; END IF;
  IF memo ->> 'updatedBy' <> auth.uid()::text THEN RAISE EXCEPTION 'memo actor was not server stamped'; END IF;
  IF memo ->> 'updatedByName' <> 'Journey owner' THEN RAISE EXCEPTION 'memo profile name was not server resolved'; END IF;
  IF memo ->> 'updatedAt' IS NULL THEN RAISE EXCEPTION 'memo timestamp was not server stamped'; END IF;

  preserved := public.tripbook_save_journey(
    (created ->> 'tripId')::uuid,
    4,
    created -> 'journey'
  );
  IF (preserved -> 'journey' -> 'memos' -> 'item-1' ->> 'content') <> '集合前確認冰爪與雨衣' THEN
    RAISE EXCEPTION 'legacy full journey save erased the shared memo';
  END IF;

  BEGIN
    PERFORM public.tripbook_save_journey_memo((created ->> 'tripId')::uuid, 3, 'item-1', 'stale memo');
    RAISE EXCEPTION 'stale memo unexpectedly succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      IF position('journey_conflict' IN SQLERRM) = 0 THEN RAISE; END IF;
  END;
END;
$assert_shared_memo_server_stamp$;

RESET ROLE;
DO $assert_owner_column_immutable$
DECLARE
  created_trip uuid;
BEGIN
  SELECT (envelope ->> 'tripId')::uuid INTO created_trip FROM tripbook_test_created;
  BEGIN
    UPDATE public.tripbook_journeys
    SET owner_id = '00000000-0000-0000-0000-000000000103'::uuid
    WHERE trip_id = created_trip;
    RAISE EXCEPTION 'journey owner_id unexpectedly changed';
  EXCEPTION
    WHEN OTHERS THEN
      IF position('journey_owner_immutable' IN SQLERRM) = 0 THEN RAISE; END IF;
  END;
END;
$assert_owner_column_immutable$;

-- Mutating the legacy trip owner must not transfer this staging document.
UPDATE public.trips AS trip
SET created_by = '00000000-0000-0000-0000-000000000103'::uuid
FROM tripbook_test_created AS created
WHERE trip.id = (created.envelope ->> 'tripId')::uuid;

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  jsonb_build_object('sub', '00000000-0000-0000-0000-000000000101', 'role', 'authenticated')::text,
  true
);
DO $assert_immutable_owner$
DECLARE
  loaded jsonb;
BEGIN
  SELECT public.tripbook_load_journey((envelope ->> 'tripId')::uuid)
  INTO loaded
  FROM tripbook_test_created AS envelope;
  IF NOT (loaded ->> 'canEdit')::boolean THEN
    RAISE EXCEPTION 'immutable journey owner lost access after legacy owner mutation';
  END IF;
END;
$assert_immutable_owner$;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  jsonb_build_object('sub', '00000000-0000-0000-0000-000000000103', 'role', 'authenticated')::text,
  true
);
DO $assert_legacy_transfer$
BEGIN
  BEGIN
    PERFORM public.tripbook_load_journey((envelope ->> 'tripId')::uuid)
    FROM tripbook_test_created AS envelope;
    RAISE EXCEPTION 'legacy trips.created_by mutation transferred journey access';
  EXCEPTION
    WHEN OTHERS THEN
      IF position('journey_not_found' IN SQLERRM) = 0 THEN RAISE; END IF;
  END;
END;
$assert_legacy_transfer$;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  jsonb_build_object('sub', '00000000-0000-0000-0000-000000000103', 'role', 'authenticated')::text,
  true
);

DO $assert_outsider$
BEGIN
  BEGIN
    PERFORM public.tripbook_load_journey((envelope ->> 'tripId')::uuid)
    FROM tripbook_test_created AS envelope;
    RAISE EXCEPTION 'outsider unexpectedly loaded the private journey';
  EXCEPTION
    WHEN OTHERS THEN
      IF position('journey_not_found' IN SQLERRM) = 0 THEN RAISE; END IF;
  END;
END;
$assert_outsider$;

RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{}'::text, true);
DO $assert_anonymous$
DECLARE
  created_trip uuid;
BEGIN
  SELECT (envelope ->> 'tripId')::uuid INTO created_trip FROM tripbook_test_created;
  BEGIN
    PERFORM public.tripbook_load_journey(created_trip);
    RAISE EXCEPTION 'anonymous RPC read unexpectedly succeeded';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
    WHEN OTHERS THEN
      IF position('not_authenticated' IN SQLERRM) = 0 AND position('journey_not_found' IN SQLERRM) = 0 THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM journey FROM public.tripbook_journeys WHERE trip_id = created_trip;
    RAISE EXCEPTION 'anonymous direct table read unexpectedly succeeded';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END;
$assert_anonymous$;

-- Memo-specific authorization and validation cases. All writes are rolled back.
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub', '00000000-0000-0000-0000-000000000104', 'role', 'authenticated')::text, true);
DO $memo_editor$
DECLARE
  current_doc jsonb;
  saved jsonb;
  trip uuid;
  rev integer;
BEGIN
  SELECT (envelope ->> 'tripId')::uuid INTO trip FROM tripbook_test_created;
  current_doc := public.tripbook_load_journey(trip);
  rev := (current_doc ->> 'revision')::integer;
  BEGIN
    PERFORM public.tripbook_save_journey_memo(trip, rev, 'not-an-activity', 'invalid');
    RAISE EXCEPTION 'unknown activity memo accepted';
  EXCEPTION WHEN OTHERS THEN
    IF position('invalid_journey' IN SQLERRM) = 0 THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.tripbook_save_journey_memo(trip, rev, 'item-1', repeat('x', 2001));
    RAISE EXCEPTION 'oversized memo accepted';
  EXCEPTION WHEN OTHERS THEN
    IF position('invalid_journey' IN SQLERRM) = 0 THEN RAISE; END IF;
  END;
  saved := public.tripbook_save_journey_memo(trip, rev, 'item-1', 'Editor memo');
  IF saved #>> '{journey,memos,item-1,updatedBy}' <> auth.uid()::text
     OR (saved ->> 'revision')::integer <> rev + 1 THEN
    RAISE EXCEPTION 'editor memo stamp or CAS incorrect';
  END IF;
  BEGIN
    PERFORM public.tripbook_save_journey(trip, rev, current_doc -> 'journey');
    RAISE EXCEPTION 'full save ignored memo revision';
  EXCEPTION WHEN OTHERS THEN
    IF position('journey_conflict' IN SQLERRM) = 0 THEN RAISE; END IF;
  END;
  saved := public.tripbook_save_journey(trip, rev + 1,
    jsonb_set(saved -> 'journey', '{memos,item-1}',
      '{"content":"forged","updatedBy":"forged-user","updatedAt":"2000-01-01T00:00:00Z"}'::jsonb));
  IF saved #>> '{journey,memos,item-1,content}' <> 'Editor memo'
     OR saved #>> '{journey,memos,item-1,updatedBy}' <> auth.uid()::text THEN
    RAISE EXCEPTION 'full save overwrote server memo';
  END IF;
END;
$memo_editor$;

SELECT set_config('request.jwt.claims', jsonb_build_object('sub', '00000000-0000-0000-0000-000000000103', 'role', 'authenticated')::text, true);
DO $memo_outsider$
BEGIN
  BEGIN
    PERFORM public.tripbook_save_journey_memo((envelope ->> 'tripId')::uuid, 1, 'item-1', 'unauthorized') FROM tripbook_test_created;
    RAISE EXCEPTION 'outsider saved memo';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$memo_outsider$;

RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{}', true);
DO $memo_anon$
BEGIN
  BEGIN
    PERFORM public.tripbook_save_journey_memo((envelope ->> 'tripId')::uuid, 1, 'item-1', 'unauthorized') FROM tripbook_test_created;
    RAISE EXCEPTION 'anonymous saved memo';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$memo_anon$;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub','00000000-0000-0000-0000-000000000101','role','authenticated')::text,true);
DO $identity_owner$
DECLARE trip uuid; state jsonb;
BEGIN
  SELECT (envelope->>'tripId')::uuid INTO trip FROM tripbook_test_created;
  state := public.tripbook_claim_member(trip,'member-1');
  IF NOT (state->'claims' @> '[{"memberId":"member-1","isSelf":true}]'::jsonb) THEN RAISE EXCEPTION 'self claim missing'; END IF;
  BEGIN
    PERFORM public.tripbook_claim_member(trip,'member-2');
    RAISE EXCEPTION 'second identity accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  state := public.tripbook_choose_flight(trip,'ba802',true);
  state := public.tripbook_choose_flight(trip,'fi0501',true);
  IF jsonb_array_length(state->'choices')<>1 OR NOT (state->'choices' @> '[{"memberId":"member-1","flightId":"fi0501"}]'::jsonb) THEN RAISE EXCEPTION 'flight replacement failed'; END IF;
  BEGIN
    PERFORM public.tripbook_choose_flight(trip,'fake-flight',true);
    RAISE EXCEPTION 'unknown flight accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END;
$identity_owner$;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub','00000000-0000-0000-0000-000000000104','role','authenticated')::text,true);
DO $identity_editor$
DECLARE trip uuid; state jsonb;
BEGIN
  SELECT (envelope->>'tripId')::uuid INTO trip FROM tripbook_test_created;
  BEGIN
    PERFORM public.tripbook_claim_member(trip,'member-1');
    RAISE EXCEPTION 'claimed identity stolen';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    PERFORM public.tripbook_choose_flight(trip,'ba801',true);
    RAISE EXCEPTION 'unclaimed account selected flight';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM public.tripbook_claim_member(trip,'member-2');
  state := public.tripbook_choose_flight(trip,'ba801',true);
  IF NOT (state->'choices' @> '[{"memberId":"member-1","flightId":"fi0501"},{"memberId":"member-2","flightId":"ba801"}]'::jsonb) THEN RAISE EXCEPTION 'editor changed someone else'; END IF;
  state := public.tripbook_claim_member(trip,NULL);
  IF jsonb_array_length(state->'claims')<>1 OR jsonb_array_length(state->'choices')<>1 THEN RAISE EXCEPTION 'release did not cascade only own choices'; END IF;
END;
$identity_editor$;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub','00000000-0000-0000-0000-000000000102','role','authenticated')::text,true);
DO $identity_readonly$
DECLARE trip uuid;
BEGIN
  SELECT (envelope->>'tripId')::uuid INTO trip FROM tripbook_test_created;
  PERFORM public.tripbook_roster(trip);
  BEGIN
    PERFORM public.tripbook_claim_member(trip,'member-2');
    RAISE EXCEPTION 'readonly claimed identity';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.tripbook_member_claims VALUES(trip,'member-2',auth.uid());
    RAISE EXCEPTION 'direct claim write accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$identity_readonly$;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub','00000000-0000-0000-0000-000000000103','role','authenticated')::text,true);
DO $identity_outsider$
DECLARE trip uuid;
BEGIN
  SELECT (envelope->>'tripId')::uuid INTO trip FROM tripbook_test_created;
  BEGIN
    PERFORM public.tripbook_roster(trip);
    RAISE EXCEPTION 'outsider read roster';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$identity_outsider$;
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{}',true);
DO $identity_anon$
BEGIN
  BEGIN
    PERFORM public.tripbook_roster((envelope->>'tripId')::uuid) FROM tripbook_test_created;
    RAISE EXCEPTION 'anonymous read roster';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$identity_anon$;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub','00000000-0000-0000-0000-000000000101','role','authenticated')::text,true);
DO $photo_owner$
DECLARE trip uuid; saved jsonb;
BEGIN
  SELECT (envelope->>'tripId')::uuid INTO trip FROM tripbook_test_created;
  saved := public.tripbook_save_photo_preferences(trip,'member-1',true,'["spot-1"]'::jsonb,'[]'::jsonb,NULL);
  IF saved->'phoneSpotIds' <> '["spot-1"]'::jsonb THEN RAISE EXCEPTION 'photo save failed'; END IF;
  BEGIN
    PERFORM public.tripbook_save_photo_preferences(trip,'member-1',false,'[]'::jsonb,'[]'::jsonb,NULL);
    RAISE EXCEPTION 'stale photo write accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'stale photo write accepted' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.tripbook_load_photo_preferences(trip,'member-2');
    RAISE EXCEPTION 'other member photo read accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$photo_owner$;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub','00000000-0000-0000-0000-000000000104','role','authenticated')::text,true);
DO $photo_editor$
DECLARE trip uuid;
BEGIN
  SELECT (envelope->>'tripId')::uuid INTO trip FROM tripbook_test_created;
  PERFORM public.tripbook_claim_member(trip,'member-2');
  PERFORM public.tripbook_save_photo_preferences(trip,'member-2',false,'[]'::jsonb,'["spot-2"]'::jsonb,NULL);
  BEGIN
    PERFORM 1 FROM public.tripbook_member_photo_preferences WHERE trip_id=trip AND member_id='member-1';
    RAISE EXCEPTION 'editor read photo table directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.tripbook_save_photo_preferences(trip,'member-1',false,'[]'::jsonb,'[]'::jsonb,NULL);
    RAISE EXCEPTION 'editor changed owner photo';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$photo_editor$;

ROLLBACK;
