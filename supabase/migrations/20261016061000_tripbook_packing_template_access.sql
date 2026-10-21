-- Allow any authorized journey member to make the shared template available.
-- This is idempotent and never creates personal items or changes ownership.
CREATE OR REPLACE FUNCTION public.tripbook_ensure_packing_template(p_trip_id uuid, p_items jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, extensions AS $function$
DECLARE v_item jsonb;
BEGIN
  IF NOT public.tripbook_can_read(p_trip_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'packing_forbidden';
  END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'packing_template_invalid'; END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.tripbook_packing_items(trip_id, category, title, is_shared, owner_id, order_index)
    SELECT p_trip_id, v_item->>'category', btrim(v_item->>'title'), true, NULL, COALESCE((v_item->>'orderIndex')::integer, 0)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.tripbook_packing_items i
      WHERE i.trip_id = p_trip_id AND i.is_shared
        AND i.category = v_item->>'category'
        AND lower(i.title) = lower(btrim(v_item->>'title'))
    );
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.tripbook_ensure_packing_template(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tripbook_ensure_packing_template(uuid, jsonb) TO authenticated;
