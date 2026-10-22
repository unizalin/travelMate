-- Fixed journey membership: invitations grant access only when an identity is claimed.
CREATE TABLE public.tripbook_fixed_journey (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  trip_id uuid NOT NULL UNIQUE REFERENCES public.tripbook_journeys(trip_id),
  owner_id uuid NOT NULL REFERENCES auth.users(id)
);
CREATE TABLE public.tripbook_invitations (
  trip_id uuid PRIMARY KEY REFERENCES public.tripbook_journeys(trip_id),
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
ALTER TABLE public.tripbook_fixed_journey ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tripbook_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tripbook_fixed_journey, public.tripbook_invitations FROM PUBLIC, anon, authenticated;
ALTER TABLE public.tripbook_member_claims ADD COLUMN claimed_at timestamptz NOT NULL DEFAULT now();

CREATE FUNCTION public.tripbook_is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, extensions AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.tripbook_fixed_journey f JOIN auth.users u ON u.id=f.owner_id
    WHERE f.owner_id=auth.uid() AND lower(u.email)='unizalin@gmail.com'
  );
$$;
CREATE OR REPLACE FUNCTION public.tripbook_can_read(p_trip_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, extensions AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.tripbook_journeys j WHERE j.trip_id=p_trip_id AND (
   CASE WHEN EXISTS(SELECT 1 FROM public.tripbook_fixed_journey f WHERE f.trip_id=p_trip_id)
   THEN j.owner_id=auth.uid() OR EXISTS(SELECT 1 FROM public.tripbook_member_claims c WHERE c.trip_id=p_trip_id AND c.user_id=auth.uid())
   ELSE j.owner_id=auth.uid() OR EXISTS(SELECT 1 FROM public.tripbook_journey_access a WHERE a.trip_id=p_trip_id AND a.user_id=auth.uid()) END
  )
 );
$$;
CREATE OR REPLACE FUNCTION public.tripbook_can_edit(p_trip_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, extensions AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.tripbook_journeys j WHERE j.trip_id=p_trip_id AND (
   CASE WHEN EXISTS(SELECT 1 FROM public.tripbook_fixed_journey f WHERE f.trip_id=p_trip_id)
   THEN j.owner_id=auth.uid() OR EXISTS(SELECT 1 FROM public.tripbook_member_claims c WHERE c.trip_id=p_trip_id AND c.user_id=auth.uid())
   ELSE j.owner_id=auth.uid() OR EXISTS(SELECT 1 FROM public.tripbook_journey_access a WHERE a.trip_id=p_trip_id AND a.user_id=auth.uid() AND a.role='editor') END
  )
 );
$$;
CREATE FUNCTION public.tripbook_invite_preview(p_token text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, extensions AS $$
DECLARE v_trip uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='not_authenticated'; END IF;
 IF p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'invalid_invitation'; END IF;
 SELECT i.trip_id INTO v_trip FROM public.tripbook_invitations i
 JOIN public.tripbook_fixed_journey f ON f.trip_id=i.trip_id
 WHERE i.token_hash=encode(extensions.digest(p_token,'sha256'),'hex') AND i.revoked_at IS NULL;
 IF v_trip IS NULL THEN RAISE EXCEPTION 'invalid_invitation'; END IF;
 RETURN jsonb_build_object('joined',EXISTS(SELECT 1 FROM public.tripbook_member_claims WHERE trip_id=v_trip AND user_id=auth.uid()),'members',(
  SELECT jsonb_agg(jsonb_build_object('id',m->>'id','name',m->>'displayName','claimed',EXISTS(
   SELECT 1 FROM public.tripbook_member_claims c WHERE c.trip_id=v_trip AND c.member_id=m->>'id'
  )) ORDER BY m->>'id') FROM public.tripbook_journeys j, jsonb_array_elements(j.journey->'members') m WHERE j.trip_id=v_trip
 ));
END;
$$;
CREATE FUNCTION public.tripbook_join_invite(p_token text,p_member_id text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, extensions AS $$
DECLARE v_trip uuid; v_claim text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='not_authenticated'; END IF;
 -- All membership/rotation operations serialize on the singleton, then invitation.
 SELECT trip_id INTO v_trip FROM public.tripbook_fixed_journey WHERE singleton FOR UPDATE;
 PERFORM public.tripbook_invite_preview(p_token);
 IF NOT EXISTS(SELECT 1 FROM public.tripbook_journeys j,jsonb_array_elements(j.journey->'members') m WHERE j.trip_id=v_trip AND m->>'id'=p_member_id) THEN RAISE EXCEPTION 'unknown_member'; END IF;
 SELECT member_id INTO v_claim FROM public.tripbook_member_claims WHERE trip_id=v_trip AND user_id=auth.uid();
 IF v_claim IS NOT NULL AND v_claim<>p_member_id THEN RAISE EXCEPTION 'account_already_claimed'; END IF;
 IF EXISTS(SELECT 1 FROM public.tripbook_member_claims WHERE trip_id=v_trip AND member_id=p_member_id AND user_id<>auth.uid()) THEN RAISE EXCEPTION 'member_already_claimed'; END IF;
 INSERT INTO public.tripbook_member_claims(trip_id,member_id,user_id) VALUES(v_trip,p_member_id,auth.uid()) ON CONFLICT DO NOTHING;
 RETURN jsonb_build_object('tripId',v_trip);
END;
$$;
CREATE FUNCTION public.tripbook_admin_state() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, extensions AS $$
DECLARE v_trip uuid;
BEGIN
 IF NOT public.tripbook_is_admin() THEN RETURN jsonb_build_object('isAdmin',false); END IF;
 SELECT trip_id INTO v_trip FROM public.tripbook_fixed_journey;
 RETURN jsonb_build_object('isAdmin',true,'inviteActive',EXISTS(SELECT 1 FROM public.tripbook_invitations WHERE trip_id=v_trip AND revoked_at IS NULL),
 'members',(SELECT jsonb_agg(jsonb_build_object('id',m->>'id','name',m->>'displayName','email',u.email,'claimedAt',c.claimed_at,'isOwner',c.user_id=j.owner_id) ORDER BY m->>'id')
 FROM public.tripbook_journeys j CROSS JOIN jsonb_array_elements(j.journey->'members') m
 LEFT JOIN public.tripbook_member_claims c ON c.trip_id=j.trip_id AND c.member_id=m->>'id'
 LEFT JOIN auth.users u ON u.id=c.user_id WHERE j.trip_id=v_trip));
END;
$$;
CREATE FUNCTION public.tripbook_rotate_invite() RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, extensions AS $$
DECLARE v_trip uuid; v_token text;
BEGIN
 IF NOT public.tripbook_is_admin() THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='admin_required'; END IF;
 SELECT trip_id INTO v_trip FROM public.tripbook_fixed_journey FOR UPDATE;
 v_token:=encode(extensions.gen_random_bytes(32),'hex');
 INSERT INTO public.tripbook_invitations(trip_id,token_hash) VALUES(v_trip,encode(extensions.digest(v_token,'sha256'),'hex'))
 ON CONFLICT(trip_id) DO UPDATE SET token_hash=excluded.token_hash,created_at=now(),revoked_at=NULL;
 RETURN v_token;
END;
$$;
CREATE FUNCTION public.tripbook_revoke_invite() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, extensions AS $$
BEGIN
 IF NOT public.tripbook_is_admin() THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='admin_required'; END IF;
 PERFORM 1 FROM public.tripbook_fixed_journey FOR UPDATE;
 UPDATE public.tripbook_invitations SET revoked_at=clock_timestamp() WHERE trip_id=(SELECT trip_id FROM public.tripbook_fixed_journey);
END;
$$;
CREATE FUNCTION public.tripbook_remove_member(p_member_id text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, extensions AS $$
DECLARE v_trip uuid; v_owner uuid; v_user uuid;
BEGIN
 IF NOT public.tripbook_is_admin() THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='admin_required'; END IF;
 SELECT trip_id,owner_id INTO v_trip,v_owner FROM public.tripbook_fixed_journey FOR UPDATE;
 SELECT user_id INTO v_user FROM public.tripbook_member_claims WHERE trip_id=v_trip AND member_id=p_member_id;
 IF v_user=v_owner OR p_member_id='member-1' THEN RAISE EXCEPTION 'owner_identity_protected'; END IF;
 DELETE FROM public.tripbook_member_claims WHERE trip_id=v_trip AND member_id=p_member_id;
 DELETE FROM public.tripbook_journey_access WHERE trip_id=v_trip AND user_id=v_user;
 DELETE FROM public.trip_members WHERE trip_id=v_trip AND user_id=v_user;
END;
$$;
-- Managed member names are immutable; account bindings live only in claims.
CREATE FUNCTION public.tripbook_fixed_identities_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,extensions AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.tripbook_fixed_journey WHERE trip_id=OLD.trip_id)
 AND NEW.journey->'members' IS DISTINCT FROM OLD.journey->'members' THEN RAISE EXCEPTION 'fixed_identities_immutable'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER tripbook_fixed_identities BEFORE UPDATE OF journey ON public.tripbook_journeys FOR EACH ROW EXECUTE FUNCTION public.tripbook_fixed_identities_guard();

-- Privileged, idempotent bootstrap. Never callable by browser roles.
CREATE FUNCTION public.tripbook_initialize_fixed(p_journey jsonb,p_packing jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,extensions AS $$
DECLARE v_owner uuid; v_trip uuid; v_doc jsonb; v_item jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(20261022,1);
 SELECT id INTO STRICT v_owner FROM auth.users WHERE lower(email)='unizalin@gmail.com';
 SELECT trip_id INTO v_trip FROM public.tripbook_fixed_journey;
 IF v_trip IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM public.tripbook_fixed_journey WHERE owner_id=v_owner) THEN RAISE EXCEPTION 'fixed_owner_mismatch'; END IF;
  RETURN v_trip;
 END IF;
 IF EXISTS(SELECT 1 FROM public.tripbook_journeys) THEN RAISE EXCEPTION 'existing_journey_requires_explicit_selection'; END IF;
 PERFORM public.tripbook_validate_journey(p_journey,p_journey->>'tripId',false);
 IF jsonb_array_length(p_journey->'members')<>6 OR jsonb_array_length(p_packing)<>45
 OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_packing) x WHERE x->>'category' NOT IN ('必帶','衣服','盥洗','其他')) THEN RAISE EXCEPTION 'invalid_fixed_seed'; END IF;
 v_trip:=gen_random_uuid();
 v_doc:=public.tripbook_remap_trip_ids(public.tripbook_normalize_journey(p_journey),v_trip);
 INSERT INTO public.profiles(id) VALUES(v_owner) ON CONFLICT DO NOTHING;
 INSERT INTO public.trips(id,name,destination,start_date,end_date,created_by) VALUES(v_trip,'倫敦＋冰島 2026','London / Iceland','2026-10-24','2026-11-07',v_owner);
 INSERT INTO public.trip_members(trip_id,user_id,role) VALUES(v_trip,v_owner,'organizer');
 INSERT INTO public.tripbook_journeys(trip_id,owner_id,journey,updated_by) VALUES(v_trip,v_owner,v_doc,v_owner);
 INSERT INTO public.tripbook_fixed_journey(trip_id,owner_id) VALUES(v_trip,v_owner);
 INSERT INTO public.tripbook_member_claims(trip_id,member_id,user_id) VALUES(v_trip,'member-1',v_owner);
 FOR v_item IN SELECT value FROM jsonb_array_elements(p_packing) LOOP
  INSERT INTO public.tripbook_packing_items(trip_id,category,title,is_shared,order_index) VALUES(v_trip,v_item->>'category',v_item->>'title',true,(v_item->>'orderIndex')::integer);
 END LOOP;
 RETURN v_trip;
END;
$$;
REVOKE ALL ON FUNCTION public.tripbook_initialize_fixed(jsonb,jsonb),public.tripbook_fixed_identities_guard() FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.tripbook_create_journey(jsonb),public.tripbook_grant_journey_access(uuid,uuid,text),public.tripbook_claim_member(uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.tripbook_is_admin(),public.tripbook_invite_preview(text),public.tripbook_join_invite(text,text),public.tripbook_admin_state(),public.tripbook_rotate_invite(),public.tripbook_revoke_invite(),public.tripbook_remove_member(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.tripbook_is_admin(),public.tripbook_invite_preview(text),public.tripbook_join_invite(text,text),public.tripbook_admin_state(),public.tripbook_rotate_invite(),public.tripbook_revoke_invite(),public.tripbook_remove_member(text) TO authenticated;

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
    SELECT m->>'displayName' INTO v_actor_name FROM public.tripbook_member_claims c
    JOIN public.tripbook_journeys j ON j.trip_id=c.trip_id
    CROSS JOIN jsonb_array_elements(j.journey->'members') m
    WHERE c.trip_id=p_trip_id AND c.user_id=v_user_id AND m->>'id'=c.member_id;
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

CREATE FUNCTION public.tripbook_fixed_packing_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.tripbook_fixed_journey WHERE trip_id=NEW.trip_id)
 AND NEW.category NOT IN ('必帶','衣服','盥洗','其他') THEN RAISE EXCEPTION 'invalid_fixed_packing_category'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER tripbook_fixed_packing BEFORE INSERT OR UPDATE ON public.tripbook_packing_items FOR EACH ROW EXECUTE FUNCTION public.tripbook_fixed_packing_guard();
REVOKE ALL ON FUNCTION public.tripbook_fixed_packing_guard() FROM PUBLIC,anon,authenticated;
