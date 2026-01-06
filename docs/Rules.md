# 開發規範

## 程式碼風格
- 使用 Vue 3 Composition API（`<script setup lang="ts">` 語法）
- 組件命名採用 PascalCase（`CountdownTimer.vue`）
- 函式命名採用 camelCase（`calculateBalance`）
- 常數命名採用 UPPER_SNAKE_CASE（`API_KEY`）
- 所有變數使用 `const` 或 `let`，禁用 `var`
- 每個檔案最多 250 行，超過需拆分

## TypeScript 規範
- 所有組件 props 必須定義型別（使用 `defineProps<T>()`）
- API 回應必須定義 interface（放在 `src/types/`）
- 避免使用 `any`，改用 `unknown` 或具體型別
- 使用 `enum` 定義固定選項（例如：`ExpenseCategory`）
- 啟用 strict mode

## Vue 組件規範
- 優先使用 `ref` 和 `reactive` 管理狀態
- 使用 `computed` 處理衍生資料（不可變更）
- 使用 `watch` 監聽資料變化並執行副作用
- 組件通訊：
  - 父到子：`props`
  - 子到父：`emits`
  - 跨層級：`provide`/`inject` 或 Pinia
- 善用 `defineProps`、`defineEmits`、`defineExpose`

## 架構分層
遵循 Component -> Composable -> Service -> Supabase 四層架構：

```text
src/
├── components/   # Vue 組件（只負責 UI）
├── composables/  # 業務邏輯 + 狀態管理（useTrips.ts）
├── services/     # 資料服務層（tripService.ts）
├── lib/          # 第三方客戶端（supabase.ts）
├── stores/       # Pinia stores
├── types/        # TypeScript 型別定義
├── views/        # 頁面組件
└── router/       # Vue Router 配置
```

範例：
- `components/TripCard.vue`：只負責顯示旅程卡片
- `composables/useTrips.ts`：管理旅程列表狀態、提供 `createTrip` 函式
- `services/tripService.ts`：封裝所有對 trips 表的 CRUD 操作
- `lib/supabase.ts`：Supabase 客戶端單例

## Supabase 規範
- 所有資料庫查詢必須包含錯誤處理（`try-catch`）
- 使用 Row Level Security 保護資料（禁止 service_role key 暴露在前端）
- 敏感操作（刪除旅程/支出）需二次確認 Dialog
- 使用 Supabase Realtime 訂閱資料變化：
  ```typescript
  const channel = supabase
    .channel('activities-changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'activities' },
      handleChange
    )
    .subscribe()
  ```
- 檔案上傳至 Storage 需檢查檔案大小（< 5MB）與格式（`image/*`）
- 離開組件時必須 unsubscribe Realtime channel

## API 呼叫規範
- 使用 `async`/`await` 處理非同步操作
- 所有 API 呼叫需 `try-catch` 包覆
- 顯示 Loading 狀態（Spinner 或 Skeleton）
- 失敗時顯示錯誤訊息（使用 Toast 組件）
- 天氣 API 快取 3 小時（使用 `localStorage`）
- 實作請求取消機制（`AbortController`）

## 樣式規範
- 使用 Tailwind CSS 撰寫樣式
- 顏色使用 Tailwind 預設色盤（藍色主色調）
- 全域樣式寫在 `src/assets/main.css`
- 組件專屬樣式使用 `<style scoped>`
- 響應式斷點：
  - mobile: < 768px (預設)
  - tablet: `md:768px`
  - desktop: `lg:1024px`
- 禁止使用 inline style 屬性

## 安全規範
- 環境變數使用 `.env.local` 管理（不提交到 Git）
- `.env.local` 範例：
  ```
  VITE_SUPABASE_URL=https://xxx.supabase.co
  VITE_SUPABASE_ANON_KEY=xxx
  VITE_OPENWEATHER_API_KEY=xxx
  ```
- Vercel 環境變數在 Dashboard 設定
- 使用者輸入必須驗證（Zod 或 Vuelidate）
- 防止 XSS：使用 `v-text` 而非 `v-html` 顯示使用者內容
- Supabase RLS 確保使用者只能存取自己的旅程
- 不可在前端暴露 service_role key

## 第三方登入規範
- LINE Login 設定：
  - 在 LINE Developers 建立 Provider 與 Channel
  - 取得 Channel ID 和 Secret
  - 在 Supabase Authentication -> Providers 啟用 LINE
  - 填入 Callback URL: `https://[SUPABASE_ID].supabase.co/auth/v1/callback`
- 使用 Supabase Auth 提供的方法：
  ```typescript
  await supabase.auth.signInWithOAuth({
    provider: 'google',
  })

  await supabase.auth.signInWithOAuth({
    provider: 'facebook',
  })

  await supabase.auth.signInWithOAuth({
    provider: 'line',
    options: {
      redirectTo: window.location.origin + '/auth/callback'
    }
  })
  ```

## Git 工作流程
- 主分支：`main`（受保護，只接受 PR）
- 功能分支命名：`feature/功能名稱`（例如：`feature/line-login`）
- Commit 訊息格式：`類型(範圍): 描述`
  - 例：`feat(auth): 新增 LINE 登入功能`
  - 類型：`feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- 每個 PR 需通過測試後才能合併

## 部署規範
- 部署前必須通過本地測試（`npm run build` 無錯誤）
- Vercel 自動部署（推送到 `main` 觸發）
- 環境變數在 Vercel Dashboard 設定
- 部署後檢查：
  - 登入功能正常
  - 資料庫讀寫成功
  - 即時同步運作
  - 第三方登入回調正常

## 錯誤處理標準
- 所有 `async` 函式必須 `try-catch`
- 錯誤訊息需使用者友善（避免技術術語）
- 記錄錯誤到 `console.error`（開發環境）
- 生產環境考慮整合錯誤追蹤服務（Sentry）

## 效能規範
- 圖片使用 WebP 格式
- 實作 lazy loading（圖片、路由）
- 列表超過 50 筆考慮分頁或虛擬滾動
- 防抖（debounce）搜尋輸入（300ms）
- 節流（throttle）拖曳事件（100ms）
