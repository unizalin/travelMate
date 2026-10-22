-- Legacy subscriptions remain tonight-only and expire without rewriting rows.
ALTER TABLE public.tripbook_push_subscriptions
 ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'tonight'
 CHECK (scope IN ('tonight','trip'));
