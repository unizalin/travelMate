# TravelMate 專案上下文 (Antigravity Context)

## 📋 專案概要
- **專案名稱**：TravelMate（旅程規劃協作應用）
- **目標**：提供一個直覺、美觀且具備 AI 輔助功能的旅程規劃平台
- **當前版本**：v1.6.0
- **開發階段**：功能完備期 + 安全性與性能優化階段

---

## 🚀 技術棧

### 前端
- **框架**：Vue 3 (Composition API) + TypeScript
- **狀態管理**：Pinia
- **樣式**：Tailwind CSS (UI/UX Pro Max 規範)
- **地圖**：Leaflet.js
- **拖曳**：VueDraggable
- **UI 組件**：Headless UI + Heroicons
- **安全性**：DOMPurify (XSS 防護)

### 後端與服務
- **後端**：Supabase (Auth, PostgreSQL, Realtime, RLS)
- **AI**：Google Gemini 2.5 Flash
- **地理服務**：OpenCage API / Nominatim
- **匯率**：ExchangeRate-API (24h 快取)
- **天氣**：OpenWeatherMap API (3h 快取)

---

## 📁 專案結構

```
src/
├── assets/          # 靜態資源、CSS
├── components/      # Vue 組件
│   ├── common/      # 通用組件
│   ├── trip/        # 行程核心組件
│   ├── map/         # 地圖組件
│   ├── ui/          # UI 元素
│   ├── modals/      # 彈窗
│   ├── auth/        # 認證組件
│   └── candidate/   # 候選景點
├── composables/     # Vue Composables
├── services/        # API 服務層
│   ├── supabase.ts           # Supabase 客戶端
│   ├── geminiService.ts      # AI 服務
│   ├── currencyService.ts    # 匯率服務
│   ├── weatherService.ts     # 天氣服務
│   ├── geocodingService.ts   # 地理編碼
│   ├── expenseService.ts     # 費用服務
│   └── preparationService.ts # 準備清單服務
├── stores/          # Pinia 狀態管理
│   ├── auth.ts      # 認證狀態
│   ├── trip.ts      # 旅程狀態
│   ├── itinerary.ts # 行程狀態
│   └── expense.ts   # 費用狀態
├── views/           # 路由頁面
├── types/           # TypeScript 型別
└── router/          # Vue Router 設定

docs/
├── Planning.md                      # 開發計畫
├── Rules.md                         # 開發規範
├── Task.md                          # 任務追蹤
├── context.md                       # 專案上下文
├── Google-OAuth-Checklist.md       # OAuth 設定檢查清單
├── OAuth-Fix-Summary.md            # OAuth 修復總結
├── Quick-Fix-Guide.md              # 快速修復指南
└── Code-Improvements-2026-01-14.md # 最新改進報告
```

---

## 🔑 關鍵檔案說明

### 核心配置
- `vite.config.ts` - Vite 建置設定
- `tailwind.config.js` - Tailwind CSS 設定
- `tsconfig.json` - TypeScript 設定
- `.env.example` - 環境變數模板
- `vercel.json` - Vercel 部署設定

### 認證系統
- `src/stores/auth.ts` - 認證狀態管理（含 OAuth）
- `src/views/AuthCallback.vue` - OAuth 回調處理
- `src/components/auth/AuthModal.vue` - 登入彈窗

### 服務層（重要）
- `src/services/supabase.ts` - Supabase 客戶端初始化
- `src/services/geminiService.ts` - AI 景點推薦
- `src/services/currencyService.ts` - 匯率轉換（含快取管理）
- `src/services/weatherService.ts` - 天氣預報（含快取管理）

### 資料庫
- `supabase/schema.sql` - 完整的資料庫 Schema 和 RLS 政策

---

## 🔒 安全性與性能特性（v1.6.0 新增）

### 安全性
1. **XSS 防護**：使用 DOMPurify 淨化 AI 生成的 HTML
2. **HTTPS 強制**：所有 API 請求使用 HTTPS
3. **環境變數保護**：API 密鑰不提交至版本控制
4. **OAuth 錯誤處理**：完善的錯誤訊息和除錯資訊
5. **RLS 權限控制**：資料庫層級的權限管理

### 性能優化
1. **智能快取**：
   - 匯率：24 小時快取 + 記憶體快取
   - 天氣：3 小時快取
   - 自動清理過期快取
2. **快取限制**：
   - 匯率最多 20 筆
   - 天氣最多 30 筆
3. **記憶體管理**：清理未使用的事件監聽器
4. **localStorage 防護**：防止儲存空間溢出

---

## 🎯 開發規範

### 程式碼風格
- 使用 Vue 3 Composition API
- TypeScript 嚴格模式
- 避免使用 `as any` 和 `@ts-ignore`
- 所有 API 請求必須有錯誤處理
- 使用 Pinia 管理全域狀態

### UI/UX 規範
- 遵循 UI/UX Pro Max 設計規範
- 使用 Tailwind CSS utility classes
- 響應式設計（手機、平板、桌面）
- 極簡風格，移除不必要的裝飾

### 安全規範
- 所有用戶輸入必須驗證
- HTML 內容必須使用 DOMPurify 淨化
- API 密鑰通過環境變數管理
- 使用 HTTPS 協議

---

## 📚 重要文檔參考

### 開發相關
1. **docs/Planning.md** - 開發路線圖和里程碑
2. **docs/Task.md** - 當前任務和待辦事項
3. **docs/Rules.md** - 開發規範和最佳實踐

### 問題排查
1. **docs/Google-OAuth-Checklist.md** - OAuth 設定完整檢查清單
2. **docs/Quick-Fix-Guide.md** - 常見問題快速修復
3. **docs/OAuth-Fix-Summary.md** - OAuth 問題詳細分析

### 最新更新
1. **docs/Code-Improvements-2026-01-14.md** - 最新的程式碼改進報告

---

## 🔧 常見任務指引

### 1. 檢查和修復程式碼問題
**需要讀取的檔案**：
```
1. docs/Code-Improvements-2026-01-14.md  # 了解最新改進
2. docs/Rules.md                         # 了解開發規範
3. src/services/*.ts                     # 檢查服務層
4. src/stores/*.ts                       # 檢查狀態管理
5. src/components/**/*.vue               # 檢查組件
```

**檢查重點**：
- 安全性問題（XSS、API 密鑰洩露）
- 性能問題（記憶體洩漏、過度渲染）
- 類型安全（避免 `as any`）
- 錯誤處理（try-catch、null 檢查）

### 2. 修復 OAuth 登入問題
**需要讀取的檔案**：
```
1. docs/Google-OAuth-Checklist.md       # 設定檢查清單
2. docs/OAuth-Fix-Summary.md            # 問題分析
3. src/stores/auth.ts                   # 認證邏輯
4. src/views/AuthCallback.vue           # 回調處理
5. src/components/auth/AuthModal.vue    # 登入介面
```

### 3. 新增功能或修改業務邏輯
**需要讀取的檔案**：
```
1. docs/Planning.md                     # 了解開發計畫
2. docs/context.md                      # 了解專案架構
3. supabase/schema.sql                  # 了解資料庫結構
4. src/types/database.ts                # 了解型別定義
5. 相關的 service 和 store 檔案
```

### 4. 優化性能
**需要讀取的檔案**：
```
1. src/services/currencyService.ts      # 快取管理範例
2. src/services/weatherService.ts       # 快取管理範例
3. src/stores/auth.ts                   # 記憶體管理範例
4. src/views/DayDetail.vue              # 組件優化範例
```

### 5. 更新文檔
**需要讀取的檔案**：
```
1. README.md                            # 主要文檔
2. docs/Planning.md                     # 開發計畫
3. docs/Task.md                         # 任務追蹤
4. 最新的改進報告
```

---

## 🐛 已知問題和限制

### 安全性
- ✅ XSS 漏洞已修復（v1.6.0）
- ✅ HTTP 協議已改為 HTTPS（v1.6.0）
- ⚠️ esbuild 開發環境漏洞（不影響生產環境）

### 性能
- ✅ localStorage 溢出已修復（v1.6.0）
- ✅ 記憶體洩漏已修復（v1.6.0）
- ⚠️ 大量景點時地圖渲染可能較慢（待優化）

### 程式碼品質
- ⚠️ 部分檔案使用過多 `as any`（待改進）
- ⚠️ 缺少單元測試（待新增）
- ⚠️ 部分錯誤處理不完整（待改進）

---

## 💡 給 Antigravity 的提示

### 分析程式碼時
1. 優先檢查安全性問題（XSS、API 密鑰、HTTPS）
2. 檢查性能問題（記憶體洩漏、快取管理）
3. 檢查類型安全（避免 `as any`）
4. 檢查錯誤處理（try-catch、null 檢查）

### 修改程式碼時
1. **不要改變 UI/UX**（除非明確要求）
2. 遵循現有的程式碼風格
3. 新增適當的註解
4. 更新相關文檔
5. 執行 `npm run type-check` 確認無錯誤

### 提交更改時
1. 使用有意義的 commit message
2. 包含 emoji 表情符號（🔒 安全性、⚡ 性能、🐛 修復、✨ 新功能）
3. 列出主要改進和技術細節
4. 更新版本號（如果需要）

---

## 📞 需要協助時

### 查看文檔
1. 先閱讀 `docs/Quick-Fix-Guide.md` 快速解決常見問題
2. 查看 `docs/Code-Improvements-2026-01-14.md` 了解最新改進
3. 參考 `docs/Rules.md` 了解開發規範

### 除錯步驟
1. 檢查瀏覽器 Console 錯誤訊息
2. 執行 `npm run type-check` 檢查類型錯誤
3. 執行 `npm run lint` 檢查程式碼風格
4. 查看 Supabase Dashboard 的 Auth Logs

---

**最後更新**：2026-01-14  
**版本**：v1.6.0  
**維護者**：Uniza Lin
