-- LOCAL ONLY. This transaction removes local documents temporarily and rolls back everything.
BEGIN;
DELETE FROM public.tripbook_journeys;
INSERT INTO auth.users(id,aud,role,email,encrypted_password,raw_app_meta_data,raw_user_meta_data)
SELECT '10000000-0000-0000-0000-000000000001','authenticated','authenticated','unizalin@gmail.com','','{}','{}'
WHERE NOT EXISTS(SELECT 1 FROM auth.users WHERE lower(email)='unizalin@gmail.com');
INSERT INTO auth.users(id,aud,role,email,encrypted_password,raw_app_meta_data,raw_user_meta_data)
VALUES ('10000000-0000-0000-0000-000000000002','authenticated','authenticated','invite-two@example.test','','{}','{}'),
('10000000-0000-0000-0000-000000000003','authenticated','authenticated','invite-three@example.test','','{}','{}');
CREATE TEMP TABLE fixture(trip uuid,owner_id uuid,token text);
GRANT ALL ON fixture TO authenticated;
\i /tmp/travelmate-fixed-seed.sql
INSERT INTO fixture(trip,owner_id) SELECT trip_id,owner_id FROM public.tripbook_fixed_journey;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.tripbook_journeys)<>1 THEN RAISE EXCEPTION 'bootstrap_count'; END IF;
 IF (SELECT count(*) FROM public.tripbook_packing_items WHERE trip_id=(SELECT trip FROM fixture))<>45 THEN RAISE EXCEPTION 'packing_count'; END IF;
 IF (SELECT count(*) FROM public.tripbook_member_claims WHERE trip_id=(SELECT trip FROM fixture) AND member_id='member-1' AND user_id=(SELECT owner_id FROM fixture))<>1 THEN RAISE EXCEPTION 'owner_U'; END IF;
 IF public.tripbook_initialize_fixed('{}','[]')<>(SELECT trip FROM fixture) THEN RAISE EXCEPTION 'bootstrap_not_idempotent'; END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',json_build_object('sub',(SELECT owner_id FROM fixture),'role','authenticated')::text,true);
UPDATE fixture SET token=public.tripbook_rotate_invite();
DO $$ BEGIN
 IF NOT (public.tripbook_admin_state()->>'isAdmin')::boolean THEN RAISE EXCEPTION 'owner_no_admin'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(public.tripbook_admin_state()->'members') m WHERE jsonb_typeof(m->'isOwner') <> 'boolean') THEN RAISE EXCEPTION 'admin_unclaimed_status_not_boolean'; END IF;
END $$;
SELECT set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.tripbook_journeys) THEN RAISE EXCEPTION 'outsider_read'; END IF;
 IF public.tripbook_can_edit((SELECT trip FROM fixture)) THEN RAISE EXCEPTION 'outsider_edit'; END IF;
 IF (public.tripbook_admin_state()->>'isAdmin')::boolean THEN RAISE EXCEPTION 'outsider_admin'; END IF;
 BEGIN PERFORM public.tripbook_rotate_invite(); RAISE EXCEPTION 'unauthorized_rotation'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.tripbook_claim_member((SELECT trip FROM fixture),'member-2'); RAISE EXCEPTION 'old_claim_bypass'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM public.tripbook_join_invite((SELECT token FROM fixture),'member-2');
 IF NOT public.tripbook_can_edit((SELECT trip FROM fixture)) THEN RAISE EXCEPTION 'joined_cannot_edit'; END IF;
 PERFORM public.tripbook_save_photo_preferences((SELECT trip FROM fixture),'member-2',false,'["fixture-spot"]','[]',NULL);
 IF NOT EXISTS(SELECT 1 FROM public.tripbook_journeys) THEN RAISE EXCEPTION 'joined_cannot_read'; END IF;
 PERFORM public.tripbook_save_journey_memo((SELECT trip FROM fixture),1,(SELECT journey->'items'->0->>'id' FROM public.tripbook_journeys WHERE trip_id=(SELECT trip FROM fixture)),'fixture memo');
 IF NOT EXISTS(SELECT 1 FROM public.tripbook_journeys j, jsonb_each(j.journey->'memos') m WHERE m.value->>'updatedByName'='jinyo') THEN RAISE EXCEPTION 'memo_identity_name'; END IF;
 BEGIN PERFORM public.tripbook_join_invite((SELECT token FROM fixture),'member-3'); RAISE EXCEPTION 'double_account'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'account_already_claimed' THEN RAISE; END IF; END;
END $$;
SELECT set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}',true);
DO $$ BEGIN
 BEGIN PERFORM public.tripbook_join_invite((SELECT token FROM fixture),'member-2'); RAISE EXCEPTION 'double_identity'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'member_already_claimed' THEN RAISE; END IF; END;
END $$;
SELECT set_config('request.jwt.claims',json_build_object('sub',(SELECT owner_id FROM fixture),'role','authenticated')::text,true);
SELECT public.tripbook_revoke_invite();
SELECT public.tripbook_remove_member('member-2');
SELECT set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.tripbook_journeys) OR public.tripbook_can_edit((SELECT trip FROM fixture)) THEN RAISE EXCEPTION 'revoked_member_access'; END IF;
 BEGIN PERFORM public.tripbook_join_invite((SELECT token FROM fixture),'member-2'); RAISE EXCEPTION 'revoked_invitation_accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'invalid_invitation' THEN RAISE; END IF; END;
 IF EXISTS(SELECT 1 FROM public.tripbook_load_packing_items((SELECT trip FROM fixture))) THEN RAISE EXCEPTION 'removed_member_packing'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.tripbook_member_photo_preferences WHERE trip_id=(SELECT trip FROM fixture) AND member_id='member-2') THEN RAISE EXCEPTION 'released_identity_retained_private_preferences'; END IF;
END $$;
ROLLBACK;
