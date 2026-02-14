-- 全新重建 Schema (包含 RLS 無限迴圈修復)
-- 此腳本會清除所有現有資料表並重新建立

-- ⚠️ 警告：這會刪除所有資料！
DROP TABLE IF EXISTS expense_payments CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS itineraries CASCADE;
DROP TABLE IF EXISTS trip_members CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 0. 建立枚舉類型
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM ('unpaid', 'pending', 'settled');
    END IF;
END $$;

-- 1. 建立 profiles 表
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.1 Backfill profiles from auth.users (Fix for "trips_created_by_fkey" error)
-- Recreating schema wipes profiles, but auth.users remains. We must restore profiles for existing users.
INSERT INTO public.profiles (id, display_name, avatar_url)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'display_name', email), 
  raw_user_meta_data->>'avatar_url'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 2. 建立 trips 表
CREATE TABLE trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  destination TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL DEFAULT substr(md5(random()::text), 0, 7),
  is_public BOOLEAN DEFAULT FALSE,
  trip_stats JSONB DEFAULT '{"distance": 0, "attractions": 0, "days": 0}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 建立 trip_members 表
CREATE TABLE trip_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('organizer', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trip_id, user_id)
);

-- 4. 建立 itineraries 表
CREATE TABLE itineraries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  day_number INTEGER NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trip_id, day_number)
);

-- 5. 建立 activities 表
CREATE TABLE activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  itinerary_id UUID REFERENCES itineraries(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  start_time TIME,
  end_time TIME,
  order_index INTEGER NOT NULL DEFAULT 0,
  duration INTEGER,
  notes TEXT,
  image_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 建立 expenses 表
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'TWD',
  category TEXT NOT NULL CHECK (category IN ('交通', '餐飲', '住宿', '門票', '其他')),
  expense_type TEXT NOT NULL CHECK (expense_type IN ('shared', 'personal')),
  paid_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  receipt_url TEXT,
  split_members JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. 建立 expense_payments 表
CREATE TABLE expense_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE NOT NULL,
  payer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  status payment_status DEFAULT 'unpaid',
  is_paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(expense_id, payer_id)
);

-- 8. 建立 ai_suggestions 表
CREATE TABLE ai_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  day_number INTEGER,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  suggested_activities JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. 建立索引
CREATE INDEX idx_trip_members_trip_id ON trip_members(trip_id);
CREATE INDEX idx_trip_members_user_id ON trip_members(user_id);
CREATE INDEX idx_itineraries_trip_id ON itineraries(trip_id);
CREATE INDEX idx_activities_itinerary_id ON activities(itinerary_id);
CREATE INDEX idx_expenses_trip_id ON expenses(trip_id);
CREATE INDEX idx_expense_payments_expense_id ON expense_payments(expense_id);
CREATE INDEX idx_ai_suggestions_trip_id ON ai_suggestions(trip_id);

-- 9. 啟用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_payments ENABLE ROW LEVEL SECURITY;

-----------------------------------------------------------------------
-- 🔥 關鍵修復：使用 SECURITY DEFINER 函數打破無限遞迴 🔥
-----------------------------------------------------------------------
-- 這個函數會以「系統權限」執行查詢，繞過 RLS policy 的自我檢查
CREATE OR REPLACE FUNCTION public.is_trip_member(trip_id uuid, user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM trip_members 
    WHERE trip_members.trip_id = $1 
    AND trip_members.user_id = $2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_trip_id_by_invite_code(code text)
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT id
    FROM trips
    WHERE invite_code = code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-----------------------------------------------------------------------

-- 10. Profiles Policy
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 11. Trips Policies (使用函數)
CREATE POLICY "Users can view trips they are members of"
  ON trips FOR SELECT
  USING (
    public.is_trip_member(id, auth.uid()) 
    OR created_by = auth.uid() -- 讓建立者也能看到（即使還沒加入成員表）
  );

CREATE POLICY "Users can create trips"
  ON trips FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Trip organizers can update trips"
  ON trips FOR UPDATE
  USING (
    EXISTS (
        SELECT 1 FROM trip_members 
        WHERE trip_id = trips.id 
        AND user_id = auth.uid() 
        AND role = 'organizer'
    )
  );

CREATE POLICY "Trip organizers can delete trips"
  ON trips FOR DELETE
  USING (
    EXISTS (
        SELECT 1 FROM trip_members 
        WHERE trip_id = trips.id 
        AND user_id = auth.uid() 
        AND role = 'organizer'
    )
  );

-- 12. Trip Members Policies (使用函數 + 分離權限)
-- A. 查看權限：
-- 1. 自己看自己 (最基本，無遞迴)
CREATE POLICY "Users can view own membership"
  ON trip_members FOR SELECT
  USING (user_id = auth.uid());

-- 2. 看同團其他成員 (使用函數避免直接 query table 造成遞迴)
CREATE POLICY "Users can view other members"
  ON trip_members FOR SELECT
  USING (public.is_trip_member(trip_id, auth.uid()));

-- B. 加入/新增權限：
-- 1. Organizer 可以加人
CREATE POLICY "Organizers can add members"
  ON trip_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_members 
      WHERE trip_id = trip_members.trip_id 
      AND user_id = auth.uid() 
      AND role = 'organizer'
    )
  );

-- 2. 建立者可以加入自己 (這是建立旅程時的關鍵一步)
CREATE POLICY "Creators can add themselves"
  ON trip_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM trips 
      WHERE id = trip_members.trip_id 
      AND created_by = auth.uid()
    )
  );

-- 13. Itineraries Policies (使用函數)
CREATE POLICY "Users can view itineraries"
  ON itineraries FOR SELECT
  USING (public.is_trip_member(trip_id, auth.uid()));

CREATE POLICY "Users can manage itineraries"
  ON itineraries FOR ALL
  USING (public.is_trip_member(trip_id, auth.uid()));

-- 14. Activities Policies (使用關聯檢查 + 函數)
CREATE POLICY "Users can view activities"
  ON activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = activities.itinerary_id
      AND public.is_trip_member(itineraries.trip_id, auth.uid())
    )
  );

    )
  );

-- 14.1 Public View Policies (For shared links)
CREATE POLICY "Public can view trips" ON trips FOR SELECT USING (true);
CREATE POLICY "Public can view itineraries" ON itineraries FOR SELECT USING (true);
CREATE POLICY "Public can view activities" ON activities FOR SELECT USING (true);

-- 15. Expenses Policies (使用函數)
CREATE POLICY "Users can view expenses"
  ON expenses FOR SELECT
  USING (public.is_trip_member(trip_id, auth.uid()));

CREATE POLICY "Users can create expenses"
  ON expenses FOR INSERT
  WITH CHECK (public.is_trip_member(trip_id, auth.uid()));

CREATE POLICY "Users can update own expenses"
  ON expenses FOR UPDATE
  USING (paid_by = auth.uid());

CREATE POLICY "Users can delete own expenses"
  ON expenses FOR DELETE
  USING (paid_by = auth.uid());

-- 16. Expense Payments Policies
CREATE POLICY "Users can view payments"
  ON expense_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM expenses
      WHERE expenses.id = expense_payments.expense_id
      AND public.is_trip_member(expenses.trip_id, auth.uid())
    )
  );

CREATE POLICY "Users can update payments for their expenses"
  ON expense_payments FOR UPDATE
  USING (
    payer_id = auth.uid() 
    OR 
    EXISTS (
      SELECT 1 FROM expenses 
      WHERE expenses.id = expense_payments.expense_id 
      AND expenses.paid_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert payments for their expenses"
  ON expense_payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expenses 
      WHERE expenses.id = expense_payments.expense_id 
      AND expenses.paid_by = auth.uid()
    )
  );

-- 17. AI Suggestions Policies
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ai suggestions"
  ON ai_suggestions FOR SELECT
  USING (public.is_trip_member(trip_id, auth.uid()));

CREATE POLICY "Users can create ai suggestions"
  ON ai_suggestions FOR INSERT
  WITH CHECK (public.is_trip_member(trip_id, auth.uid()));

-- 18. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE activities;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE expense_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE preparation_items;
ALTER PUBLICATION supabase_realtime ADD TABLE preparation_item_completions;
ALTER PUBLICATION supabase_realtime ADD TABLE candidate_activities;
ALTER PUBLICATION supabase_realtime ADD TABLE candidate_likes;

-- 21. Candidate Activities
CREATE TABLE candidate_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  description TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  creator_name VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'added', 'rejected')),
  google_maps_url TEXT,
  added_to_day INTEGER,
  added_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 22. Candidate Likes
CREATE TABLE candidate_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidate_activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(candidate_id, user_id)
);

ALTER TABLE candidate_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view candidate activities for their trips"
  ON candidate_activities FOR SELECT
  USING (public.is_trip_member(trip_id, auth.uid()));

CREATE POLICY "Users can manage candidate activities for their trips"
  ON candidate_activities FOR ALL
  USING (public.is_trip_member(trip_id, auth.uid()));

CREATE POLICY "Users can view candidate likes"
  ON candidate_likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM candidate_activities
      WHERE id = candidate_likes.candidate_id
      AND public.is_trip_member(trip_id, auth.uid())
    )
  );

CREATE POLICY "Users can manage own likes"
  ON candidate_likes FOR ALL
  USING (user_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE preparation_items;
ALTER PUBLICATION supabase_realtime ADD TABLE preparation_item_completions;

-- 19. Preparation Items
CREATE TABLE preparation_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_shared BOOLEAN DEFAULT FALSE,
  category TEXT DEFAULT '其他',
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 20. Preparation Item Completions (Multi-user tracking)
CREATE TABLE preparation_item_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES preparation_items(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(item_id, user_id)
);

ALTER TABLE preparation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE preparation_item_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view preparation items"
  ON preparation_items FOR SELECT
  USING (
    is_shared = true AND public.is_trip_member(trip_id, auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can manage preparation items"
  ON preparation_items FOR ALL
  USING (public.is_trip_member(trip_id, auth.uid()));

CREATE POLICY "Users can view completions"
  ON preparation_item_completions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM preparation_items
      WHERE id = preparation_item_completions.item_id
      AND (is_shared = true AND public.is_trip_member(trip_id, auth.uid()) OR user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage own completions"
  ON preparation_item_completions FOR ALL
  USING (user_id = auth.uid());

-- 18-21. Triggers & Functions (維持原樣)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it already exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
