-- Additive private activity threads. Existing journey memos remain untouched.
BEGIN;
CREATE TABLE public.tripbook_activity_comments (
  id uuid PRIMARY KEY,
  trip_id uuid NOT NULL REFERENCES public.tripbook_journeys(trip_id) ON DELETE CASCADE,
  activity_id text NOT NULL,
  parent_id uuid REFERENCES public.tripbook_activity_comments(id),
  author_id uuid NOT NULL REFERENCES auth.users(id),
  member_id text,
  author_name text,
  content text NOT NULL CHECK (char_length(btrim(content)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX tripbook_activity_comments_thread_idx ON public.tripbook_activity_comments(trip_id, activity_id, created_at, id);
ALTER TABLE public.tripbook_activity_comments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tripbook_activity_comments FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.tripbook_comment_json(p_comment public.tripbook_activity_comments)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = pg_catalog, public AS $function$
  SELECT jsonb_build_object('id', p_comment.id, 'parentId', p_comment.parent_id, 'memberId', p_comment.member_id,
    'authorName', p_comment.author_name, 'content', p_comment.content, 'createdAt', p_comment.created_at);
$function$;

CREATE FUNCTION public.tripbook_list_comments(p_trip_id uuid, p_activity_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.tripbook_can_read(p_trip_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'journey_access_required';
  END IF;
  RETURN (SELECT COALESCE(jsonb_agg(public.tripbook_comment_json(c) ORDER BY c.created_at, c.id), '[]'::jsonb)
    FROM public.tripbook_activity_comments c WHERE c.trip_id=p_trip_id AND c.activity_id=p_activity_id);
END;
$function$;

CREATE FUNCTION public.tripbook_post_comment(p_trip_id uuid, p_activity_id text, p_request_id uuid, p_content text, p_parent_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_member text;
  v_name text;
  v_comment public.tripbook_activity_comments;
BEGIN
  IF v_actor IS NULL OR NOT public.tripbook_can_edit(p_trip_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'journey_editor_required';
  END IF;
  IF p_request_id IS NULL OR p_content IS NULL OR char_length(btrim(p_content)) NOT BETWEEN 1 AND 2000 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'comment_invalid';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tripbook_journeys j, jsonb_array_elements(j.journey->'items') item
    WHERE j.trip_id=p_trip_id AND item->>'id'=p_activity_id) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'activity_not_found';
  END IF;
  IF p_parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.tripbook_activity_comments c
    WHERE c.id=p_parent_id AND c.trip_id=p_trip_id AND c.activity_id=p_activity_id AND c.parent_id IS NULL) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'reply_not_found';
  END IF;
  SELECT c.member_id INTO v_member FROM public.tripbook_member_claims c WHERE c.trip_id=p_trip_id AND c.user_id=v_actor;
  SELECT NULLIF(btrim(p.display_name), '') INTO v_name FROM public.profiles p WHERE p.id=v_actor;
  INSERT INTO public.tripbook_activity_comments(id, trip_id, activity_id, parent_id, author_id, member_id, author_name, content)
    VALUES(p_request_id, p_trip_id, p_activity_id, p_parent_id, v_actor, v_member, v_name, btrim(p_content))
    ON CONFLICT(id) DO NOTHING;
  SELECT * INTO v_comment FROM public.tripbook_activity_comments WHERE id=p_request_id;
  IF v_comment.author_id IS DISTINCT FROM v_actor OR v_comment.trip_id IS DISTINCT FROM p_trip_id
    OR v_comment.activity_id IS DISTINCT FROM p_activity_id OR v_comment.parent_id IS DISTINCT FROM p_parent_id
    OR v_comment.content IS DISTINCT FROM btrim(p_content) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'comment_request_conflict';
  END IF;
  RETURN public.tripbook_comment_json(v_comment);
END;
$function$;
REVOKE ALL ON FUNCTION public.tripbook_comment_json(public.tripbook_activity_comments) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tripbook_list_comments(uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tripbook_post_comment(uuid,text,uuid,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tripbook_list_comments(uuid,text), public.tripbook_post_comment(uuid,text,uuid,text,uuid) TO authenticated;
COMMIT;
