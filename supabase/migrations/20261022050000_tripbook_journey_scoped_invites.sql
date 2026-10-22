-- Membership and administration are scoped to the requested journey.
-- Existing documents, choices, comments and completions are not rewritten.
ALTER TABLE public.tripbook_fixed_journey DROP CONSTRAINT tripbook_fixed_journey_pkey;
ALTER TABLE public.tripbook_fixed_journey ADD PRIMARY KEY (trip_id);
CREATE FUNCTION public.tripbook_is_admin(p_trip_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS (
 SELECT 1 FROM public.tripbook_journeys WHERE trip_id=p_trip_id AND owner_id=auth.uid());
$$;
CREATE FUNCTION public.tripbook_admin_state(p_trip_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, extensions AS $$
DECLARE v_trip uuid;
BEGIN
 IF NOT public.tripbook_is_admin(p_trip_id) THEN RETURN jsonb_build_object('isAdmin',false); END IF;
 SELECT trip_id INTO v_trip FROM public.tripbook_fixed_journey WHERE trip_id=p_trip_id;
 RETURN jsonb_build_object('isAdmin',true,'inviteActive',EXISTS(SELECT 1 FROM public.tripbook_invitations WHERE trip_id=v_trip AND revoked_at IS NULL),
 'members',(SELECT jsonb_agg(jsonb_build_object('id',m->>'id','name',m->>'displayName','email',u.email,'claimedAt',c.claimed_at,'isOwner',COALESCE(c.user_id=j.owner_id,false)) ORDER BY m->>'id')
 FROM public.tripbook_journeys j CROSS JOIN jsonb_array_elements(j.journey->'members') m
 LEFT JOIN public.tripbook_member_claims c ON c.trip_id=j.trip_id AND c.member_id=m->>'id'
 LEFT JOIN auth.users u ON u.id=c.user_id WHERE j.trip_id=v_trip));
END;
$$;
CREATE FUNCTION public.tripbook_rotate_invite(p_trip_id uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, extensions AS $$
DECLARE v_trip uuid; v_token text;
BEGIN
 IF NOT public.tripbook_is_admin(p_trip_id) THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='admin_required'; END IF;
 SELECT trip_id INTO v_trip FROM public.tripbook_fixed_journey WHERE trip_id=p_trip_id FOR UPDATE;
 v_token:=encode(extensions.gen_random_bytes(32),'hex');
 INSERT INTO public.tripbook_invitations(trip_id,token_hash) VALUES(v_trip,encode(extensions.digest(v_token,'sha256'),'hex'))
 ON CONFLICT(trip_id) DO UPDATE SET token_hash=excluded.token_hash,created_at=now(),revoked_at=NULL;
 RETURN v_token;
END;
$$;
CREATE FUNCTION public.tripbook_revoke_invite(p_trip_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, extensions AS $$
BEGIN
 IF NOT public.tripbook_is_admin(p_trip_id) THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='admin_required'; END IF;
 PERFORM 1 FROM public.tripbook_fixed_journey WHERE trip_id=p_trip_id FOR UPDATE;
 UPDATE public.tripbook_invitations SET revoked_at=clock_timestamp() WHERE trip_id=(SELECT trip_id FROM public.tripbook_fixed_journey WHERE trip_id=p_trip_id);
END;
$$;
CREATE FUNCTION public.tripbook_remove_member(p_trip_id uuid,p_member_id text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, extensions AS $$
DECLARE v_trip uuid; v_owner uuid; v_user uuid;
BEGIN
 IF NOT public.tripbook_is_admin(p_trip_id) THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='admin_required'; END IF;
 SELECT trip_id,owner_id INTO v_trip,v_owner FROM public.tripbook_fixed_journey WHERE trip_id=p_trip_id FOR UPDATE;
 SELECT user_id INTO v_user FROM public.tripbook_member_claims WHERE trip_id=v_trip AND member_id=p_member_id;
 IF v_user=v_owner THEN RAISE EXCEPTION 'owner_identity_protected'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_trip::text || ':' || p_member_id,0));
 DELETE FROM public.tripbook_member_claims WHERE trip_id=v_trip AND member_id=p_member_id;
 DELETE FROM public.tripbook_member_photo_preferences WHERE trip_id=v_trip AND member_id=p_member_id;
 DELETE FROM public.tripbook_journey_access WHERE trip_id=v_trip AND user_id=v_user;
 DELETE FROM public.trip_members WHERE trip_id=v_trip AND user_id=v_user;
END;
$$;
CREATE OR REPLACE FUNCTION public.tripbook_join_invite(p_token text,p_member_id text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, extensions AS $$
DECLARE v_trip uuid; v_claim text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='not_authenticated'; END IF;
 IF p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'invalid_invitation'; END IF;
 SELECT trip_id INTO v_trip FROM public.tripbook_invitations
 WHERE token_hash=encode(extensions.digest(p_token,'sha256'),'hex') AND revoked_at IS NULL;
 IF v_trip IS NULL THEN RAISE EXCEPTION 'invalid_invitation'; END IF;
 PERFORM 1 FROM public.tripbook_fixed_journey WHERE trip_id=v_trip FOR UPDATE;
 -- Recheck under the same journey lock used by rotate/revoke/remove.
 PERFORM public.tripbook_invite_preview(p_token);
 IF NOT EXISTS(SELECT 1 FROM public.tripbook_journeys j,jsonb_array_elements(j.journey->'members') m WHERE j.trip_id=v_trip AND m->>'id'=p_member_id) THEN RAISE EXCEPTION 'unknown_member'; END IF;
 SELECT member_id INTO v_claim FROM public.tripbook_member_claims WHERE trip_id=v_trip AND user_id=auth.uid();
 IF v_claim IS NOT NULL AND v_claim<>p_member_id THEN RAISE EXCEPTION 'account_already_claimed'; END IF;
 IF EXISTS(SELECT 1 FROM public.tripbook_member_claims WHERE trip_id=v_trip AND member_id=p_member_id AND user_id<>auth.uid()) THEN RAISE EXCEPTION 'member_already_claimed'; END IF;
 INSERT INTO public.tripbook_member_claims(trip_id,member_id,user_id) VALUES(v_trip,p_member_id,auth.uid()) ON CONFLICT DO NOTHING;
 RETURN jsonb_build_object('tripId',v_trip);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.tripbook_is_admin(),public.tripbook_admin_state(),public.tripbook_rotate_invite(),public.tripbook_revoke_invite(),public.tripbook_remove_member(text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.tripbook_is_admin(uuid),public.tripbook_admin_state(uuid),public.tripbook_rotate_invite(uuid),public.tripbook_revoke_invite(uuid),public.tripbook_remove_member(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.tripbook_is_admin(uuid),public.tripbook_admin_state(uuid),public.tripbook_rotate_invite(uuid),public.tripbook_revoke_invite(uuid),public.tripbook_remove_member(uuid,text) TO authenticated;
