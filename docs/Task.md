# 開發任務清單

## 階段一：專案初始化（1 天）
- [ ] 使用 Vite 建立 Vue 3 + TypeScript 專案
- [ ] 安裝相依套件
  - @supabase/supabase-js
  - pinia
  - vue-router
  - tailwindcss
  - vuedraggable@next
  - @headlessui/vue
  - @heroicons/vue
- [ ] 設定 Tailwind CSS 配置
- [ ] 建立 Supabase 專案並取得 API Key
- [ ] 配置環境變數（.env.local）
- [ ] 建立 Git Repository 並推送到 GitHub
- [ ] 設定 TypeScript 配置（strict mode）
- [ ] 建立基礎資料夾結構

## 階段二：Supabase 設定（1 天）
- [ ] 建立 profiles 資料表
- [ ] 建立 trips 資料表
- [ ] 建立 trip_members 資料表
- [ ] 建立 itineraries 資料表
- [ ] 建立 activities 資料表
- [ ] 建立 expenses 資料表
- [ ] 建立 expense_payments 資料表
- [ ] 設定外鍵關聯（ON DELETE CASCADE）
- [ ] 啟用 Row Level Security（RLS）
- [ ] 建立 RLS 政策（trips, expenses, activities）
- [ ] 啟用 Realtime（針對 activities 和 expenses 表）
- [ ] 設定 Storage Bucket（景點照片與收據）
- [ ] 啟用第三方登入（LINE、Google、Facebook）

## 階段三：認證系統（2 天）
- [ ] 建立 Supabase 客戶端（src/lib/supabase.ts）
- [ ] 建立型別定義（src/types/database.ts, src/types/auth.ts）
- [ ] 建立 Auth Store（src/stores/auth.ts, Pinia）
- [ ] 實作登入頁面（src/views/Login.vue）
  - Email + 密碼登入
  - LINE 登入按鈕
  - Google 登入按鈕
  - Facebook 登入按鈕
- [ ] 實作註冊頁面（src/views/Register.vue）
- [ ] 實作路由守衛（src/router/index.ts）
- [ ] 實作自動登入（檢查 Supabase Session）
- [ ] 建立使用者個人資料頁面（src/views/Profile.vue）
- [ ] 實作登出功能
- [ ] 處理 OAuth 回調（src/views/AuthCallback.vue）

## 階段四：旅程管理（2 天）
- [ ] 建立旅程列表頁面（src/views/Trips.vue）
- [ ] 建立 Trip Store（src/stores/trip.ts）
- [ ] 建立 Trip Service（src/services/tripService.ts）
- [ ] 實作建立旅程表單（src/components/CreateTripModal.vue）
  - 旅程名稱、目的地、起迄日期
  - 儲存後自動成為 organizer
  - 生成唯一邀請碼
- [ ] 實作旅程卡片組件（src/components/TripCard.vue）
- [ ] 實作邀請成員功能（src/components/InviteModal.vue）
- [ ] 實作加入旅程頁面（src/views/JoinTrip.vue）
- [ ] 實作旅程詳情頁面（src/views/TripDetail.vue）
- [ ] 實作 Tab 切換（行程、記帳、成員）

## 階段五：首頁行程與倒數（2 天）
- [ ] 建立行程頁面（src/views/Itinerary.vue）
- [ ] 建立 Itinerary Store（src/stores/itinerary.ts）
- [ ] 實作倒數計時器組件（src/components/CountdownTimer.vue）
- [ ] 串接 OpenWeatherMap API（src/services/weatherService.ts）
- [ ] 實作天氣快取邏輯（localStorage, 3 小時）
- [ ] 實作天氣提示框組件（src/components/WeatherTooltip.vue）
- [ ] 實作每日行程卡片（src/components/DayCard.vue）
- [ ] 實作展開景點詳情功能
- [ ] 響應式設計（mobile, tablet, desktop）

## 階段六：景點規劃與拖曳（3 天）
- [ ] 安裝並設定 vuedraggable
- [ ] 建立景點列表組件（src/components/ActivityList.vue）
- [ ] 實作拖曳排序功能（同一天內）
- [ ] 實作跨日期拖曳（從第一天拖到第二天）
- [ ] 實作拖曳結束事件處理
  - 更新 order_index
  - 更新 itinerary_id（跨日期移動）
- [ ] 建立新增景點表單（src/components/AddActivityModal.vue）
- [ ] 實作景點照片上傳（Supabase Storage）
- [ ] 實作編輯景點功能（src/components/EditActivityModal.vue）
- [ ] 實作刪除景點功能（含二次確認）
- [ ] 實作即時同步（Supabase Realtime）
- [ ] 處理並發編輯衝突

## 階段七：記帳系統（3 天）
- [ ] 建立記帳頁面（src/views/Expenses.vue）
- [ ] 建立 Expense Store（src/stores/expense.ts）
- [ ] 建立 Expense Service（src/services/expenseService.ts）
- [ ] 實作新增支出表單（src/components/AddExpenseModal.vue）
  - 支出名稱、金額、幣別
  - 類別選擇
  - 公帳/個人帳切換
  - 付款人選擇
  - 分攤對象多選
  - 上傳收據照片
  - 計算每人應分攤金額
- [ ] 實作支出列表組件（src/components/ExpenseList.vue）
- [ ] 實作支出卡片組件（src/components/ExpenseCard.vue）
- [ ] 實作篩選器（全部/公帳/個人帳）
- [ ] 實作排序功能（日期/金額）
- [ ] 實作繳交狀態組件（src/components/PaymentStatus.vue）
- [ ] 實作結算面板（src/components/SettlementPanel.vue）
  - 計算每人總支出
  - 計算應收/應付金額
  - 生成轉帳建議
- [ ] 實作編輯支出功能
- [ ] 實作刪除支出功能
- [ ] 實作即時同步（監聽 expenses 表）

## 階段八：部署到 Vercel（1 天）
- [ ] 註冊 Vercel 帳號並連結 GitHub
- [ ] 在 Vercel 建立新專案
- [ ] 設定環境變數
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY
  - VITE_OPENWEATHER_API_KEY
- [ ] 設定 Build Command 和 Output Directory
- [ ] 建立 vercel.json 配置（SPA 路由重寫）
- [ ] 推送程式碼觸發自動部署
- [ ] 驗證部署成功
  - 檢查登入功能
  - 檢查資料讀寫
  - 檢查即時同步
  - 檢查第三方登入回調
- [ ] 設定自訂網域（選用）

## 階段九：測試與優化（2 天）
- [ ] 功能測試
  - 註冊/登入/登出流程
  - 建立旅程與邀請成員
  - 新增/編輯/刪除景點
  - 拖曳排序與跨日期移動
  - 新增/編輯/刪除支出
  - 繳交狀態更新
  - 結算計算正確性
- [ ] 即時同步測試（多個瀏覽器同時編輯）
- [ ] 響應式測試（mobile, tablet, desktop）
- [ ] 效能優化
  - 圖片壓縮與 lazy loading
  - 列表虛擬滾動（超過 100 筆）
  - 防抖（debounce）搜尋與篩選
- [ ] 錯誤處理
  - API 失敗顯示 Toast 提示
  - 網路斷線顯示重試按鈕
  - 表單驗證錯誤提示
- [ ] 建立單元測試（Vitest）
- [ ] 建立 E2E 測試（Playwright, 選用）
