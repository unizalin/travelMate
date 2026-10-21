-- Private, member-scoped packing checklist for the TripBook journey.
CREATE TABLE IF NOT EXISTS public.tripbook_packing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.tripbook_journeys(trip_id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('必帶', '衣服', '盥洗', '其他')),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 160),
  is_shared boolean NOT NULL DEFAULT true,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (is_shared OR owner_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS tripbook_packing_shared_title_idx
  ON public.tripbook_packing_items (trip_id, category, lower(title)) WHERE is_shared;

CREATE TABLE IF NOT EXISTS public.tripbook_packing_completions (
  item_id uuid NOT NULL REFERENCES public.tripbook_packing_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (item_id, user_id)
);

ALTER TABLE public.tripbook_packing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tripbook_packing_completions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.tripbook_packing_items, public.tripbook_packing_completions FROM PUBLIC, anon;
GRANT SELECT ON public.tripbook_packing_items, public.tripbook_packing_completions TO authenticated;

DROP POLICY IF EXISTS tripbook_packing_items_read ON public.tripbook_packing_items;
CREATE POLICY tripbook_packing_items_read ON public.tripbook_packing_items FOR SELECT TO authenticated
  USING (public.tripbook_can_read(trip_id) AND (is_shared OR owner_id = auth.uid()));
DROP POLICY IF EXISTS tripbook_packing_completions_read ON public.tripbook_packing_completions;
CREATE POLICY tripbook_packing_completions_read ON public.tripbook_packing_completions FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.tripbook_packing_items i WHERE i.id = item_id AND public.tripbook_can_read(i.trip_id)));

CREATE OR REPLACE FUNCTION public.tripbook_initialize_packing(p_trip_id uuid, p_items jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, extensions AS $function$
DECLARE v_item jsonb;
BEGIN
  IF NOT public.tripbook_can_edit(p_trip_id) THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'packing_read_only'; END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'packing_template_invalid'; END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    IF jsonb_typeof(v_item->'category') IS DISTINCT FROM 'string' OR jsonb_typeof(v_item->'title') IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'packing_template_invalid'; END IF;
    INSERT INTO public.tripbook_packing_items(trip_id, category, title, is_shared, owner_id, order_index)
    SELECT p_trip_id, v_item->>'category', btrim(v_item->>'title'), true, NULL, COALESCE((v_item->>'orderIndex')::integer, 0)
    WHERE NOT EXISTS (SELECT 1 FROM public.tripbook_packing_items i WHERE i.trip_id = p_trip_id AND i.is_shared AND i.category = v_item->>'category' AND lower(i.title) = lower(btrim(v_item->>'title')));
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tripbook_load_packing_items(p_trip_id uuid)
RETURNS TABLE(id uuid, trip_id uuid, category text, title text, is_shared boolean, owner_id uuid, order_index integer, completed boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, extensions AS $function$
  SELECT i.id, i.trip_id, i.category, i.title, i.is_shared, i.owner_id, i.order_index,
    EXISTS (SELECT 1 FROM public.tripbook_packing_completions c WHERE c.item_id = i.id AND c.user_id = auth.uid())
  FROM public.tripbook_packing_items i
  WHERE i.trip_id = p_trip_id AND public.tripbook_can_read(p_trip_id) AND (i.is_shared OR i.owner_id = auth.uid())
  ORDER BY i.order_index, i.created_at;
$function$;

CREATE OR REPLACE FUNCTION public.tripbook_set_packing_completion(p_item_id uuid, p_completed boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, extensions AS $function$
DECLARE v_trip_id uuid;
BEGIN
  SELECT trip_id INTO v_trip_id FROM public.tripbook_packing_items WHERE id = p_item_id AND (is_shared OR owner_id = auth.uid());
  IF v_trip_id IS NULL OR NOT public.tripbook_can_read(v_trip_id) THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'packing_item_forbidden'; END IF;
  IF p_completed THEN INSERT INTO public.tripbook_packing_completions(item_id, user_id) VALUES (p_item_id, auth.uid()) ON CONFLICT DO NOTHING;
  ELSE DELETE FROM public.tripbook_packing_completions WHERE item_id = p_item_id AND user_id = auth.uid(); END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tripbook_add_packing_item(p_trip_id uuid, p_category text, p_title text, p_is_shared boolean, p_order_index integer DEFAULT 0)
RETURNS public.tripbook_packing_items LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, extensions AS $function$
DECLARE v_item public.tripbook_packing_items;
BEGIN
  IF p_is_shared AND NOT public.tripbook_can_edit(p_trip_id) THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'packing_shared_read_only'; END IF;
  IF NOT p_is_shared AND auth.uid() IS NULL THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'not_authenticated'; END IF;
  IF NOT public.tripbook_can_read(p_trip_id) THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'packing_forbidden'; END IF;
  INSERT INTO public.tripbook_packing_items(trip_id, category, title, is_shared, owner_id, order_index)
    VALUES (p_trip_id, p_category, btrim(p_title), p_is_shared, CASE WHEN p_is_shared THEN NULL ELSE auth.uid() END, p_order_index) RETURNING * INTO v_item;
  RETURN v_item;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tripbook_update_packing_item(p_item_id uuid, p_title text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, extensions AS $function$
BEGIN
  UPDATE public.tripbook_packing_items i SET title = btrim(p_title), updated_at = clock_timestamp()
  WHERE i.id = p_item_id AND ((i.is_shared AND public.tripbook_can_edit(i.trip_id)) OR (NOT i.is_shared AND i.owner_id = auth.uid()));
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'packing_edit_forbidden'; END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tripbook_delete_packing_item(p_item_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, extensions AS $function$
BEGIN
  DELETE FROM public.tripbook_packing_items i
  WHERE i.id = p_item_id AND ((i.is_shared AND public.tripbook_can_edit(i.trip_id)) OR (NOT i.is_shared AND i.owner_id = auth.uid()));
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'packing_delete_forbidden'; END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.tripbook_initialize_packing(uuid, jsonb), public.tripbook_load_packing_items(uuid), public.tripbook_set_packing_completion(uuid, boolean), public.tripbook_add_packing_item(uuid, text, text, boolean, integer), public.tripbook_update_packing_item(uuid, text), public.tripbook_delete_packing_item(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tripbook_initialize_packing(uuid, jsonb), public.tripbook_load_packing_items(uuid), public.tripbook_set_packing_completion(uuid, boolean), public.tripbook_add_packing_item(uuid, text, text, boolean, integer), public.tripbook_update_packing_item(uuid, text), public.tripbook_delete_packing_item(uuid) TO authenticated;
