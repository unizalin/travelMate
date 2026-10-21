-- Add the departure checklist category without changing existing items or completions.
ALTER TABLE public.tripbook_packing_items
  DROP CONSTRAINT IF EXISTS tripbook_packing_items_category_check;

ALTER TABLE public.tripbook_packing_items
  ADD CONSTRAINT tripbook_packing_items_category_check
  CHECK (category IN ('出發前', '必帶', '衣服', '盥洗', '其他'));
