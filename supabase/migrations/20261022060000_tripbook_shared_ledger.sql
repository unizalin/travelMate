-- Journey-scoped ledger. Original expense tables and journey documents remain unchanged.
CREATE TABLE public.tripbook_ledger_entries (
 id uuid PRIMARY KEY,
 trip_id uuid NOT NULL REFERENCES public.tripbook_journeys(trip_id) ON DELETE CASCADE,
 kind text NOT NULL CHECK (kind IN ('expense','repayment')),
 title text NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
 currency text NOT NULL CHECK (currency IN ('GBP','ISK','TWD')),
 amount_minor bigint NOT NULL CHECK (amount_minor BETWEEN 1 AND 1000000000000),
 payer_id text NOT NULL,
 allocations jsonb NOT NULL CHECK (jsonb_typeof(allocations)='array'),
 occurred_on date NOT NULL,
 created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 revision integer NOT NULL DEFAULT 1 CHECK (revision>0),
 voided_at timestamptz
);
CREATE INDEX tripbook_ledger_trip_idx ON public.tripbook_ledger_entries(trip_id,occurred_on DESC,created_at DESC);
ALTER TABLE public.tripbook_ledger_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tripbook_ledger_entries FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.tripbook_ledger_entries TO authenticated;
CREATE POLICY tripbook_ledger_member_read ON public.tripbook_ledger_entries
 FOR SELECT TO authenticated USING (public.tripbook_can_read(trip_id));

CREATE FUNCTION public.tripbook_ledger(p_trip_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NOT public.tripbook_can_read(p_trip_id) THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='journey_access_required'; END IF;
 RETURN jsonb_build_object('entries',COALESCE((SELECT jsonb_agg(jsonb_build_object(
 'id',e.id,'kind',e.kind,'title',e.title,'currency',e.currency,'amountMinor',e.amount_minor,
 'payerId',e.payer_id,'allocations',e.allocations,'occurredOn',e.occurred_on,
 'revision',e.revision,'createdAt',e.created_at,'canManage',COALESCE(e.created_by=auth.uid(),false) OR public.tripbook_is_admin(p_trip_id)
 ) ORDER BY e.occurred_on DESC,e.created_at DESC,e.id)
 FROM public.tripbook_ledger_entries e WHERE e.trip_id=p_trip_id AND e.voided_at IS NULL),'[]'::jsonb));
END;
$$;

CREATE FUNCTION public.tripbook_save_ledger_entry(
 p_trip_id uuid,p_id uuid,p_expected_revision integer,p_kind text,p_title text,p_currency text,
 p_amount_minor bigint,p_payer_id text,p_participants text[],p_occurred_on date
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_journey jsonb; v_existing public.tripbook_ledger_entries; v_allocations jsonb; v_count integer;
BEGIN
 IF NOT public.tripbook_can_edit(p_trip_id) THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='journey_editor_required'; END IF;
 -- Serialize this journey's ledger writes and recheck membership after acquiring the lock.
 PERFORM pg_advisory_xact_lock(hashtextextended('ledger:'||p_trip_id::text,0));
 IF NOT public.tripbook_can_edit(p_trip_id) THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='journey_editor_required'; END IF;
 SELECT journey INTO v_journey FROM public.tripbook_journeys WHERE trip_id=p_trip_id;
 IF p_id IS NULL OR p_expected_revision IS NULL OR p_expected_revision<0
 OR p_kind IS NULL OR p_kind NOT IN ('expense','repayment')
 OR p_title IS NULL OR length(btrim(p_title)) NOT BETWEEN 1 AND 120
 OR p_currency IS NULL OR p_currency NOT IN ('GBP','ISK','TWD')
 OR p_amount_minor IS NULL OR p_amount_minor NOT BETWEEN 1 AND 1000000000000
 OR p_occurred_on IS NULL OR p_occurred_on NOT BETWEEN DATE '2000-01-01' AND DATE '2100-12-31'
 THEN RAISE EXCEPTION 'invalid_ledger_entry'; END IF;
 IF p_participants IS NULL OR cardinality(p_participants) NOT BETWEEN 1 AND 100
 OR cardinality(p_participants)<>(SELECT count(DISTINCT x) FROM unnest(p_participants) x)
 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v_journey->'members') m WHERE m->>'id'=p_payer_id)
 OR EXISTS(SELECT 1 FROM unnest(p_participants) x WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v_journey->'members') m WHERE m->>'id'=x))
 THEN RAISE EXCEPTION 'invalid_ledger_members'; END IF;
 IF p_kind='repayment' AND (cardinality(p_participants)<>1 OR p_participants[1]=p_payer_id)
 THEN RAISE EXCEPTION 'invalid_ledger_members'; END IF;
 v_count:=cardinality(p_participants);
 SELECT jsonb_agg(jsonb_build_object('memberId',member_id,'amountMinor',
 p_amount_minor/v_count + CASE WHEN position<=p_amount_minor%v_count THEN 1 ELSE 0 END) ORDER BY member_id)
 INTO v_allocations FROM (SELECT x AS member_id,row_number() OVER(ORDER BY x) AS position FROM unnest(p_participants) x) participants;
 SELECT * INTO v_existing FROM public.tripbook_ledger_entries WHERE id=p_id FOR UPDATE;
 IF FOUND THEN
  IF v_existing.trip_id<>p_trip_id OR NOT (COALESCE(v_existing.created_by=auth.uid(),false) OR public.tripbook_is_admin(p_trip_id))
  THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ledger_author_required'; END IF;
  IF v_existing.voided_at IS NOT NULL THEN RAISE EXCEPTION 'ledger_conflict'; END IF;
  -- Repeating an identical create request after a lost response cannot duplicate a charge.
  IF p_expected_revision=0 AND v_existing.revision=1 AND v_existing.kind=p_kind
   AND v_existing.title=btrim(p_title) AND v_existing.currency=p_currency AND v_existing.amount_minor=p_amount_minor
   AND v_existing.payer_id=p_payer_id AND v_existing.allocations=v_allocations AND v_existing.occurred_on=p_occurred_on
  THEN RETURN public.tripbook_ledger(p_trip_id); END IF;
  IF v_existing.revision<>p_expected_revision THEN RAISE EXCEPTION 'ledger_conflict'; END IF;
  UPDATE public.tripbook_ledger_entries SET kind=p_kind,title=btrim(p_title),currency=p_currency,
   amount_minor=p_amount_minor,payer_id=p_payer_id,allocations=v_allocations,occurred_on=p_occurred_on,
   revision=revision+1,updated_at=clock_timestamp() WHERE id=p_id;
 ELSE
  IF p_expected_revision<>0 THEN RAISE EXCEPTION 'ledger_conflict'; END IF;
  INSERT INTO public.tripbook_ledger_entries(id,trip_id,kind,title,currency,amount_minor,payer_id,allocations,occurred_on,created_by)
   VALUES(p_id,p_trip_id,p_kind,btrim(p_title),p_currency,p_amount_minor,p_payer_id,v_allocations,p_occurred_on,auth.uid());
 END IF;
 RETURN public.tripbook_ledger(p_trip_id);
END;
$$;

CREATE FUNCTION public.tripbook_void_ledger_entry(p_trip_id uuid,p_id uuid,p_expected_revision integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_entry public.tripbook_ledger_entries;
BEGIN
 IF NOT public.tripbook_can_edit(p_trip_id) THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='journey_editor_required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('ledger:'||p_trip_id::text,0));
 IF NOT public.tripbook_can_edit(p_trip_id) THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='journey_editor_required'; END IF;
 SELECT * INTO v_entry FROM public.tripbook_ledger_entries WHERE id=p_id AND trip_id=p_trip_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ledger_conflict'; END IF;
 IF NOT (COALESCE(v_entry.created_by=auth.uid(),false) OR public.tripbook_is_admin(p_trip_id))
 THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ledger_author_required'; END IF;
 IF v_entry.revision<>p_expected_revision OR v_entry.voided_at IS NOT NULL THEN RAISE EXCEPTION 'ledger_conflict'; END IF;
 UPDATE public.tripbook_ledger_entries SET voided_at=clock_timestamp(),updated_at=clock_timestamp(),revision=revision+1 WHERE id=p_id;
 RETURN public.tripbook_ledger(p_trip_id);
END;
$$;
REVOKE ALL ON FUNCTION public.tripbook_ledger(uuid),public.tripbook_save_ledger_entry(uuid,uuid,integer,text,text,text,bigint,text,text[],date),public.tripbook_void_ledger_entry(uuid,uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.tripbook_ledger(uuid),public.tripbook_save_ledger_entry(uuid,uuid,integer,text,text,text,bigint,text,text[],date),public.tripbook_void_ledger_entry(uuid,uuid,integer) TO authenticated;
