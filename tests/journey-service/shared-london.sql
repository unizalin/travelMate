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
      jsonb_build_object('id', 'member-2', 'tripId', 'draft-local-fixture', 'displayName', NULL, 'accountId', NULL),
      jsonb_build_object('id', 'member-3', 'tripId', 'draft-local-fixture', 'displayName', NULL, 'accountId', NULL),
      jsonb_build_object('id', 'member-4', 'tripId', 'draft-local-fixture', 'displayName', NULL, 'accountId', NULL),
      jsonb_build_object('id', 'member-5', 'tripId', 'draft-local-fixture', 'displayName', NULL, 'accountId', NULL),
      jsonb_build_object('id', 'member-6', 'tripId', 'draft-local-fixture', 'displayName', NULL, 'accountId', NULL)
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



DO $london$
DECLARE
 trip uuid := (SELECT (envelope->>'tripId')::uuid FROM tripbook_test_created);
 first jsonb;
 again jsonb;
 changed jsonb;
 item_id text := 'london-2026-10-25-3';
BEGIN
 first:=public.tripbook_add_london_prelude(trip);
 again:=public.tripbook_add_london_prelude(trip);
 IF first->>'revision' IS DISTINCT FROM again->>'revision' OR first->'journey' IS DISTINCT FROM again->'journey' THEN RAISE EXCEPTION 'import was not idempotent'; END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(first->'journey'->'items') i WHERE i->>'id'='item-1' AND i->>'name'='Arrival') THEN RAISE EXCEPTION 'original activity lost'; END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(first->'journey'->'items') i WHERE i->>'id'=item_id AND i->'participation'='["member-2","member-3","member-4","member-5"]'::jsonb AND i->'plannedStart'='null'::jsonb) THEN RAISE EXCEPTION 'participants or supplied hours lost'; END IF;
 changed:=jsonb_set(first->'journey','{items}',(SELECT jsonb_agg(CASE WHEN i->>'id'=item_id THEN jsonb_set(i,'{name}','"Shared museum edit"') ELSE i END) FROM jsonb_array_elements(first->'journey'->'items') i));
 PERFORM public.tripbook_save_journey(trip,(first->>'revision')::integer,changed);
 PERFORM public.tripbook_grant_journey_access(trip,'00000000-0000-0000-0000-000000000104','editor');
 PERFORM public.tripbook_grant_journey_access(trip,'00000000-0000-0000-0000-000000000102','member');
 PERFORM set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000104","role":"authenticated"}',true);
 again:=public.tripbook_load_journey(trip);
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(again->'journey'->'items') i WHERE i->>'id'=item_id AND i->>'name'='Shared museum edit') THEN RAISE EXCEPTION 'second editor cannot see update'; END IF;
 PERFORM public.tripbook_post_comment(trip,item_id,'00000000-0000-0000-0000-000000000581','第二個帳號留言');
 changed:=jsonb_set(again->'journey','{items}',(SELECT jsonb_agg(CASE WHEN i->>'id'=item_id THEN jsonb_set(i,'{notes}','"Second editor changed notes"') ELSE i END) FROM jsonb_array_elements(again->'journey'->'items') i));
 again:=public.tripbook_save_journey(trip,(again->>'revision')::integer,changed);
 again:=public.tripbook_add_london_prelude(trip);
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(again->'journey'->'items') i WHERE i->>'id'=item_id AND i->>'notes'='Second editor changed notes') THEN RAISE EXCEPTION 'repeat import overwrote edit'; END IF;
 PERFORM set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000101","role":"authenticated"}',true);
 IF jsonb_array_length(public.tripbook_list_comments(trip,item_id))<>1 THEN RAISE EXCEPTION 'owner cannot see second editor comment'; END IF;
 BEGIN
  PERFORM public.tripbook_save_journey(trip,(first->>'revision')::integer,changed);
  RAISE EXCEPTION 'stale CAS accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'journey_conflict' THEN RAISE; END IF; END;
 PERFORM set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000102","role":"authenticated"}',true);
 PERFORM public.tripbook_load_journey(trip);
 PERFORM public.tripbook_list_comments(trip,item_id);
 BEGIN
  PERFORM public.tripbook_save_journey(trip,(again->>'revision')::integer,changed);
  RAISE EXCEPTION 'read-only saved London';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.tripbook_add_london_prelude(trip);
  RAISE EXCEPTION 'read-only imported';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000103","role":"authenticated"}',true);
 BEGIN
  PERFORM public.tripbook_load_journey(trip);
  RAISE EXCEPTION 'outsider read';
 EXCEPTION WHEN SQLSTATE 'P0002' OR insufficient_privilege THEN NULL; END;
END;
$london$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $anon$
BEGIN
 BEGIN
  PERFORM public.tripbook_add_london_prelude('00000000-0000-0000-0000-000000000999');
  RAISE EXCEPTION 'anonymous import allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$anon$;
ROLLBACK;
