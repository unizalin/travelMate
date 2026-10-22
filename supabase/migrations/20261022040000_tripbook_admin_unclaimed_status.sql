-- Unclaimed members still return a boolean administrator flag.
CREATE OR REPLACE FUNCTION public.tripbook_admin_state() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, extensions AS $$
DECLARE v_trip uuid;
BEGIN
 IF NOT public.tripbook_is_admin() THEN RETURN jsonb_build_object('isAdmin',false); END IF;
 SELECT trip_id INTO v_trip FROM public.tripbook_fixed_journey;
 RETURN jsonb_build_object('isAdmin',true,'inviteActive',EXISTS(SELECT 1 FROM public.tripbook_invitations WHERE trip_id=v_trip AND revoked_at IS NULL),
 'members',(SELECT jsonb_agg(jsonb_build_object('id',m->>'id','name',m->>'displayName','email',u.email,'claimedAt',c.claimed_at,'isOwner',COALESCE(c.user_id=j.owner_id,false)) ORDER BY m->>'id')
 FROM public.tripbook_journeys j CROSS JOIN jsonb_array_elements(j.journey->'members') m
 LEFT JOIN public.tripbook_member_claims c ON c.trip_id=j.trip_id AND c.member_id=m->>'id'
 LEFT JOIN auth.users u ON u.id=c.user_id WHERE j.trip_id=v_trip));
END;
$$;
