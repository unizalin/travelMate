# 團隊出遊管理系統 - 專案規劃

## 專案概述
專案名稱：TravelMate 團隊出遊管理系統
目標用戶：5-30 人的團體旅遊（公司團建、朋友揪團、家族旅遊）
核心價值：多人即時協作的行程規劃與記帳分攤平台

## 使用者情境
1. 團隊領隊建立旅程，邀請成員加入（透過邀請連結或 Email）
2. 所有成員可同時編輯行程、新增景點、記錄支出
3. 系統自動計算每個人應付金額，追蹤繳交狀態
4. 出發前每日顯示倒數與目的地天氣

## 技術架構
- 前端框架：Vue 3 + Vite + TypeScript
- 狀態管理：Pinia
- UI 框架：Tailwind CSS + Headless UI
- 後端服務：Supabase
  - Auth：會員系統 + 第三方登入（LINE、Google、Facebook）
  - Database：PostgreSQL 關聯式資料庫
  - Realtime：WebSocket 即時同步
  - Storage：圖片上傳（景點照片、收據）
- 部署方式：Vercel（自動 CI/CD）
- API 串接：OpenWeatherMap API（天氣資訊）

## 資料庫 Schema

### profiles（使用者資料表）
- id (uuid, primary key, references auth.users)
- display_name (text) - 顯示名稱
- avatar_url (text) - 頭像 URL
- created_at (timestamp)

### trips（旅程表）
- id (uuid, primary key)
- name (text) - 旅程名稱
- destination (text) - 目的地
- start_date (date) - 開始日期
- end_date (date) - 結束日期
- created_by (uuid, references profiles.id) - 建立者
- invite_code (text, unique) - 邀請碼
- created_at (timestamp)

### trip_members（旅程成員關聯表）
- id (uuid, primary key)
- trip_id (uuid, references trips.id)
- user_id (uuid, references profiles.id)
- role (text) - 角色（organizer/member）
- joined_at (timestamp)

### itineraries（行程表）
- id (uuid, primary key)
- trip_id (uuid, references trips.id)
- day_number (integer) - 第幾天
- date (date)
- created_at (timestamp)

### activities（景點表）
- id (uuid, primary key)
- itinerary_id (uuid, references itineraries.id)
- name (text) - 景點名稱
- location (text) - 地址
- order_index (integer) - 排序序號
- duration (integer) - 停留時間（分鐘）
- notes (text) - 備註
- image_url (text) - 景點照片
- created_by (uuid, references profiles.id)
- created_at (timestamp)
- updated_at (timestamp)

### expenses（支出表）
- id (uuid, primary key)
- trip_id (uuid, references trips.id)
- name (text) - 支出項目
- amount (numeric) - 金額
- currency (text) - 幣別（TWD/JPY/USD）
- category (text) - 分類（交通/餐飲/住宿/門票/其他）
- expense_type (text) - 公帳(shared)/個人帳(personal)
- paid_by (uuid, references profiles.id) - 付款人
- receipt_url (text) - 收據照片
- split_members (jsonb) - 分攤對象陣列 [{user_id, amount}]
- created_at (timestamp)
- updated_at (timestamp)

### expense_payments（繳交記錄表）
- id (uuid, primary key)
- expense_id (uuid, references expenses.id)
- payer_id (uuid, references profiles.id) - 應付款人
- amount (numeric) - 應付金額
- is_paid (boolean) - 是否已繳交
- paid_at (timestamp) - 繳交時間

### Row Level Security (RLS) - Updated Strategy
RLS policies have been refactored to use `SECURITY DEFINER` functions to prevent infinite recursion and ensure performance.

Core Function: `is_trip_member(trip_id, user_id)`
- Used in almost all policies to safely check membership without direct recursive table queries.

Key Policy Example (Trips):
```sql
CREATE POLICY "Users can view trips they are members of"
ON trips FOR SELECT
USING (
  public.is_trip_member(id, auth.uid()) 
  OR created_by = auth.uid()
);
```

### activities（景點表）
- id (uuid, primary key)
- itinerary_id (uuid, references itineraries.id)
- name (text) - 景點名稱
- location (text) - 地址
- start_time (time) - 開始時間（新增）
- end_time (time) - 結束時間（新增）
- order_index (integer) - 排序序號
- duration (integer) - 停留時間（分鐘）
- notes (text) - 備註
- image_url (text) - 景點照片
- created_by (uuid, references profiles.id)
- created_at (timestamp)
- updated_at (timestamp)

### ai_suggestions（AI 建議記錄表）- 新增
- id (uuid, primary key)
- trip_id (uuid, references trips.id)
- user_id (uuid, references profiles.id)
- user_message (text) - 使用者提問
- ai_response (text) - AI 回覆
- suggested_activities (jsonb) - AI 建議的景點列表
- created_at (timestamp)


Please refer to `supabase/schema.sql` for the latest and complete policy definitions.
