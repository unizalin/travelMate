# TravelMate 檔案索引

## 📚 快速查找指南

### 🔍 按功能分類

#### 認證系統 (Authentication)
```
src/stores/auth.ts                   # 認證狀態管理、OAuth 實作
src/views/AuthCallback.vue           # OAuth 回調處理
src/components/auth/AuthModal.vue    # 登入彈窗
src/views/Login.vue                  # 登入頁面
src/views/Register.vue               # 註冊頁面
src/views/Profile.vue                # 個人資料頁面
```

#### 旅程管理 (Trip Management)
```
src/stores/trip.ts                   # 旅程狀態管理
src/views/Trips.vue                  # 旅程列表
src/views/TripDetail.vue             # 旅程詳情
src/views/TripOverview.vue           # 旅程總覽
src/views/JoinTrip.vue               # 加入旅程
src/components/trip/CountdownTimer.vue  # 倒數計時器
```

#### 行程管理 (Itinerary)
```
src/stores/itinerary.ts              # 行程狀態管理
src/views/DayDetail.vue              # 單日行程
src/views/Itinerary.vue              # 行程總覽
src/components/trip/ActivityCard.vue # 景點卡片
```

#### 地圖功能 (Map)
```
src/views/DayMapView.vue             # 單日地圖
src/views/TripMapOverview.vue        # 地圖總覽
src/components/map/LeafletMap.vue    # Leaflet 地圖組件
```

#### AI 助手 (AI Assistant)
```
src/components/trip/AIAssistant.vue  # AI 對話介面
src/services/geminiService.ts        # Gemini AI 服務
src/services/aiSchedulingService.ts  # AI 排程服務
```

#### 費用管理 (Expense)
```
src/stores/expense.ts                # 費用狀態管理
src/services/expenseService.ts       # 費用服務
src/services/currencyService.ts      # 匯率服務
```

#### 準備清單 (Preparation)
```
src/services/preparationService.ts   # 準備清單服務
src/components/trip/PreparationList.vue  # 準備清單組件
```

#### 候選景點 (Candidate Activities)
```
src/views/CandidateActivitiesView.vue     # 候選景點頁面
src/services/candidateService.ts          # 候選景點服務
src/components/candidate/AddCandidateModal.vue  # 新增候選景點
```

---

### 🛠️ 按技術層級分類

#### 配置檔案 (Configuration)
```
vite.config.ts                       # Vite 建置設定
tsconfig.json                        # TypeScript 設定
tsconfig.node.json                   # Node TypeScript 設定
tailwind.config.js                   # Tailwind CSS 設定
postcss.config.js                    # PostCSS 設定
vercel.json                          # Vercel 部署設定
.env.example                         # 環境變數模板
.gitignore                           # Git 忽略檔案
package.json                         # 依賴項和腳本
```

#### 服務層 (Services)
```
src/services/supabase.ts             # Supabase 客戶端初始化
src/services/geminiService.ts        # AI 服務（含 XSS 防護）
src/services/currencyService.ts      # 匯率服務（含快取管理）
src/services/weatherService.ts       # 天氣服務（含快取管理）
src/services/geocodingService.ts     # 地理編碼服務
src/services/expenseService.ts       # 費用服務
src/services/preparationService.ts   # 準備清單服務
src/services/candidateService.ts     # 候選景點服務
src/services/shareService.ts         # 分享服務（QR Code）
src/services/profileService.ts       # 個人資料服務
src/services/aiSchedulingService.ts  # AI 排程服務
```

#### 狀態管理 (Stores)
```
src/stores/auth.ts                   # 認證狀態（含記憶體管理）
src/stores/trip.ts                   # 旅程狀態
src/stores/itinerary.ts              # 行程狀態
src/stores/expense.ts                # 費用狀態
```

#### 路由 (Router)
```
src/router/index.ts                  # Vue Router 設定
```

#### 型別定義 (Types)
```
src/types/database.ts                # Supabase 資料庫型別
src/vite-env.d.ts                    # Vite 環境型別
```

#### 樣式 (Styles)
```
src/assets/main.css                  # 主要樣式檔案
```

#### 資料庫 (Database)
```
supabase/schema.sql                  # 完整 Schema 和 RLS 政策
```

---

### 📖 按問題類型分類

#### 安全性問題 (Security)
**XSS 防護範例**：
```
src/components/trip/AIAssistant.vue  # DOMPurify 使用範例
```

**API 密鑰管理**：
```
.env.example                         # 環境變數模板
src/services/supabase.ts             # 環境變數驗證
src/services/geminiService.ts        # API Key 檢查
src/services/weatherService.ts       # API Key 檢查
```

**HTTPS 強制**：
```
src/services/weatherService.ts       # HTTPS 協議範例
src/services/currencyService.ts      # HTTPS 協議範例
```

**OAuth 安全**：
```
src/stores/auth.ts                   # OAuth 實作
src/views/AuthCallback.vue           # 錯誤處理範例
docs/Google-OAuth-Checklist.md       # 安全檢查清單
```

#### 性能問題 (Performance)
**快取管理範例**：
```
src/services/currencyService.ts      # 24h 快取 + 自動清理
src/services/weatherService.ts       # 3h 快取 + 自動清理
```

**記憶體管理範例**：
```
src/stores/auth.ts                   # 事件監聽器清理
```

**過度渲染問題**：
```
src/views/DayDetail.vue              # watch 深度監視問題
```

#### 類型安全問題 (Type Safety)
**避免 `as any` 範例**：
```
src/services/preparationService.ts   # 過度使用 as any（待改進）
src/services/candidateService.ts     # 過度使用 as any（待改進）
```

**正確的型別定義**：
```
src/types/database.ts                # Supabase 型別定義
src/services/geminiService.ts        # 介面定義範例
```

#### 錯誤處理 (Error Handling)
**完善的錯誤處理範例**：
```
src/views/AuthCallback.vue           # OAuth 錯誤處理
src/services/currencyService.ts      # API 錯誤處理 + fallback
src/services/weatherService.ts       # API 錯誤處理
```

**需要改進的錯誤處理**：
```
src/stores/expense.ts                # 缺少 null 檢查
```

---

### 📝 文檔檔案

#### 開發文檔
```
docs/Planning.md                     # 開發路線圖和里程碑
docs/Task.md                         # 當前任務和待辦事項
docs/Rules.md                        # 開發規範和最佳實踐
docs/context.md                      # 專案上下文
```

#### 問題排查文檔
```
docs/Google-OAuth-Checklist.md       # OAuth 設定完整檢查清單
docs/OAuth-Fix-Summary.md            # OAuth 問題詳細分析
docs/Quick-Fix-Guide.md              # 常見問題快速修復
```

#### 改進報告
```
docs/Code-Improvements-2026-01-14.md # 最新程式碼改進報告
```

#### Antigravity 專用
```
.antigravity/context.md              # Antigravity 專案上下文
.antigravity/QUICK_START.md          # 快速啟動指南
.antigravity/FILE_INDEX.md           # 本檔案
```

---

### 🎯 常見任務的檔案清單

#### 任務：全面程式碼檢查
**必讀檔案（按順序）**：
```
1. .antigravity/context.md
2. README.md
3. docs/Code-Improvements-2026-01-14.md
4. docs/Rules.md
5. package.json
6. src/services/*.ts (所有服務層)
7. src/stores/*.ts (所有狀態管理)
8. src/components/trip/AIAssistant.vue
9. src/views/AuthCallback.vue
10. supabase/schema.sql
```

#### 任務：修復 OAuth 問題
**必讀檔案（按順序）**：
```
1. docs/Google-OAuth-Checklist.md
2. docs/OAuth-Fix-Summary.md
3. src/stores/auth.ts
4. src/views/AuthCallback.vue
5. src/components/auth/AuthModal.vue
6. src/services/supabase.ts
7. src/router/index.ts
```

#### 任務：性能優化
**必讀檔案（按順序）**：
```
1. docs/Code-Improvements-2026-01-14.md
2. src/services/currencyService.ts
3. src/services/weatherService.ts
4. src/stores/auth.ts
5. src/views/DayDetail.vue
```

#### 任務：新增功能
**必讀檔案（按順序）**：
```
1. docs/Planning.md
2. docs/context.md
3. supabase/schema.sql
4. src/types/database.ts
5. 相關的 service、store、view 檔案
```

#### 任務：修復 Bug
**必讀檔案（按順序）**：
```
1. docs/Quick-Fix-Guide.md
2. 相關的錯誤日誌
3. 相關的 service、store、view 檔案
```

---

### 🔑 關鍵檔案標記

#### ⭐⭐⭐ 最重要（必讀）
```
.antigravity/context.md              # 專案完整上下文
README.md                            # 專案概述
docs/Code-Improvements-2026-01-14.md # 最新改進報告
src/services/supabase.ts             # Supabase 客戶端
src/stores/auth.ts                   # 認證狀態管理
supabase/schema.sql                  # 資料庫結構
```

#### ⭐⭐ 很重要（建議閱讀）
```
docs/Rules.md                        # 開發規範
docs/Planning.md                     # 開發計畫
src/services/geminiService.ts        # AI 服務
src/services/currencyService.ts      # 匯率服務（快取範例）
src/services/weatherService.ts       # 天氣服務（快取範例）
src/components/trip/AIAssistant.vue  # AI 助手（XSS 防護範例）
src/views/AuthCallback.vue           # OAuth 回調（錯誤處理範例）
```

#### ⭐ 重要（視需求閱讀）
```
其他 service、store、view 檔案
配置檔案
文檔檔案
```

---

### 📊 檔案統計

```
總檔案數：約 100+ 個
核心檔案：約 30 個
服務層：11 個
狀態管理：4 個
視圖頁面：15 個
組件：30+ 個
文檔：10+ 個
```

---

### 🔄 檔案更新記錄

#### v1.6.0 (2026-01-14)
**新增**：
- `.env.example`
- `docs/Google-OAuth-Checklist.md`
- `docs/OAuth-Fix-Summary.md`
- `docs/Quick-Fix-Guide.md`
- `docs/Code-Improvements-2026-01-14.md`
- `.antigravity/context.md`
- `.antigravity/QUICK_START.md`
- `.antigravity/FILE_INDEX.md`

**修改**：
- `src/components/trip/AIAssistant.vue` - XSS 防護
- `src/services/weatherService.ts` - HTTPS + 快取管理
- `src/services/currencyService.ts` - 快取管理
- `src/stores/auth.ts` - 記憶體洩漏修復
- `src/views/AuthCallback.vue` - OAuth 錯誤處理
- `src/components/auth/AuthModal.vue` - 錯誤處理改進
- `README.md` - 文檔更新
- `package.json` - 新增 dompurify

---

**建立日期**：2026-01-14  
**維護者**：Kiro AI Assistant  
**用途**：幫助 Antigravity 快速找到需要的檔案
