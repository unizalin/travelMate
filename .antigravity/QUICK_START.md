# Antigravity 快速啟動指南

## 🎯 如何讓 Antigravity 像 Kiro 一樣理解專案

### 第一步：讀取核心文檔（必讀）

```
1. .antigravity/context.md           # 專案完整上下文（本檔案的姊妹檔）
2. README.md                         # 專案概述和使用說明
3. docs/Code-Improvements-2026-01-14.md  # 最新改進報告
```

### 第二步：根據任務類型讀取相關檔案

#### 任務 A：全面程式碼檢查和優化
**目標**：像 Kiro 一樣分析整個專案，找出問題並修復

**必讀檔案**：
```
核心配置：
- package.json                       # 依賴項和腳本
- tsconfig.json                      # TypeScript 設定
- vite.config.ts                     # 建置設定
- .env.example                       # 環境變數模板

開發規範：
- docs/Rules.md                      # 開發規範
- docs/Planning.md                   # 開發計畫
- docs/Task.md                       # 任務追蹤

服務層（重點）：
- src/services/supabase.ts           # Supabase 客戶端
- src/services/geminiService.ts      # AI 服務
- src/services/currencyService.ts    # 匯率服務（含快取管理範例）
- src/services/weatherService.ts     # 天氣服務（含快取管理範例）
- src/services/geocodingService.ts   # 地理編碼
- src/services/expenseService.ts     # 費用服務
- src/services/preparationService.ts # 準備清單服務

狀態管理：
- src/stores/auth.ts                 # 認證狀態（含記憶體管理範例）
- src/stores/trip.ts                 # 旅程狀態
- src/stores/itinerary.ts            # 行程狀態
- src/stores/expense.ts              # 費用狀態

關鍵組件：
- src/components/trip/AIAssistant.vue      # AI 助手（含 XSS 防護範例）
- src/components/auth/AuthModal.vue        # 登入彈窗
- src/views/AuthCallback.vue               # OAuth 回調（含錯誤處理範例）
- src/views/DayDetail.vue                  # 單日行程

資料庫：
- supabase/schema.sql                # 完整 Schema 和 RLS 政策
```

**檢查重點**：
1. 安全性：XSS、API 密鑰洩露、HTTP vs HTTPS
2. 性能：記憶體洩漏、localStorage 溢出、過度渲染
3. 類型安全：避免 `as any` 和 `@ts-ignore`
4. 錯誤處理：try-catch、null 檢查
5. 程式碼品質：重複代碼、最佳實踐

---

#### 任務 B：修復 OAuth 登入問題
**目標**：診斷和修復 Google/Facebook 登入問題

**必讀檔案**：
```
問題診斷：
- docs/Google-OAuth-Checklist.md     # 完整檢查清單
- docs/OAuth-Fix-Summary.md          # 問題分析和解決方案
- docs/Quick-Fix-Guide.md            # 快速修復步驟

相關程式碼：
- src/stores/auth.ts                 # OAuth 實作邏輯
- src/views/AuthCallback.vue         # 回調處理
- src/components/auth/AuthModal.vue  # 登入介面
- src/services/supabase.ts           # Supabase 設定
```

**檢查步驟**：
1. 檢查 `signInWithOAuth()` 函數實作
2. 檢查 `AuthCallback.vue` 的錯誤處理
3. 檢查 Supabase 設定（detectSessionInUrl）
4. 檢查路由設定（/auth/callback）
5. 提供 Supabase Dashboard 設定檢查清單

---

#### 任務 C：新增功能或修改業務邏輯
**目標**：在現有架構上新增功能

**必讀檔案**：
```
架構理解：
- docs/context.md                    # 專案架構
- docs/Planning.md                   # 開發計畫
- supabase/schema.sql                # 資料庫結構
- src/types/database.ts              # 型別定義

相關模組：
- 根據功能選擇對應的 service、store、view 檔案
```

**開發步驟**：
1. 了解現有架構和資料流
2. 檢查是否需要新增資料庫表
3. 實作 service 層（API 調用）
4. 實作 store 層（狀態管理）
5. 實作 view/component 層（UI）
6. 新增錯誤處理和類型定義
7. 更新文檔

---

#### 任務 D：性能優化
**目標**：提升應用程式性能

**必讀檔案**：
```
範例參考：
- src/services/currencyService.ts    # 快取管理範例
- src/services/weatherService.ts     # 快取清理範例
- src/stores/auth.ts                 # 記憶體管理範例
- src/views/DayDetail.vue            # 組件優化範例

效能分析：
- docs/Code-Improvements-2026-01-14.md  # 已知性能問題
```

**優化重點**：
1. localStorage 快取管理
2. 記憶體洩漏（事件監聽器）
3. 不必要的重新渲染
4. API 調用優化
5. 打包大小優化

---

#### 任務 E：更新文檔
**目標**：保持文檔與程式碼同步

**必讀檔案**：
```
- README.md                          # 主要文檔
- docs/Planning.md                   # 開發計畫
- docs/Task.md                       # 任務追蹤
- docs/Code-Improvements-*.md        # 改進報告
```

**更新內容**：
1. 新功能說明
2. API 變更
3. 環境變數更新
4. 已知問題和限制
5. 版本號和更新日期

---

## 🔍 Kiro 的分析流程（供參考）

### 1. 初始理解階段
```
讀取順序：
1. README.md                         # 了解專案概述
2. docs/Task.md                      # 了解當前任務
3. docs/Planning.md                  # 了解開發階段
4. docs/context.md                   # 了解技術架構
```

### 2. 深度分析階段
```
使用 context-gatherer 子代理：
- 分析專案結構
- 識別關鍵檔案
- 找出潛在問題
- 提供具體建議
```

### 3. 問題分類階段
```
分類標準：
- 🔴 高優先級：安全性、記憶體洩漏、資料遺失風險
- 🟡 中優先級：性能問題、程式碼品質
- 🟢 低優先級：文檔、測試、優化建議
```

### 4. 修復實施階段
```
修復順序：
1. 安全性問題（XSS、API 密鑰）
2. 記憶體洩漏和性能問題
3. 類型安全和錯誤處理
4. 程式碼品質改進
5. 文檔更新
```

### 5. 驗證階段
```
檢查項目：
1. npm run type-check              # TypeScript 檢查
2. npm run lint                    # ESLint 檢查
3. getDiagnostics                  # IDE 診斷
4. git status                      # 檢查變更
5. 建立改進報告
```

### 6. 提交階段
```
提交流程：
1. git add .
2. 撰寫詳細的 commit message
3. 包含 emoji 和分類
4. 列出主要改進
5. 更新版本號
```

---

## 💡 給 Antigravity 的建議

### 分析專案時
1. **先讀取 context.md**：這是最重要的檔案，包含所有關鍵資訊
2. **使用子代理**：對於大型專案，使用 context-gatherer 進行初步分析
3. **關注安全性**：優先檢查 XSS、API 密鑰、HTTPS
4. **檢查性能**：記憶體洩漏、localStorage 溢出、過度渲染
5. **保持一致性**：遵循現有的程式碼風格和架構

### 修改程式碼時
1. **不改變 UI/UX**：除非明確要求
2. **保持向後兼容**：不破壞現有功能
3. **新增註解**：解釋複雜的邏輯
4. **更新文檔**：保持文檔與程式碼同步
5. **執行檢查**：type-check、lint、diagnostics

### 提交更改時
1. **有意義的 commit message**：清楚描述改進內容
2. **使用 emoji**：🔒 安全性、⚡ 性能、🐛 修復、✨ 新功能
3. **列出細節**：主要改進、技術細節、影響範圍
4. **更新版本號**：遵循語義化版本規範

---

## 📝 範例：Kiro 的完整工作流程

### 使用者請求
```
"請先閱讀完整的檔案，檢查 Google 第三方登入跳轉是否有出現問題"
```

### Kiro 的執行步驟

#### 1. 讀取核心文檔
```
- README.md
- docs/Task.md
- docs/Planning.md
- docs/context.md
```

#### 2. 搜尋相關檔案
```
- 搜尋 "google" 關鍵字
- 搜尋 "auth" 關鍵字
- 搜尋 "OAuth" 關鍵字
```

#### 3. 讀取關鍵檔案
```
- src/stores/auth.ts
- src/views/AuthCallback.vue
- src/components/auth/AuthModal.vue
- src/router/index.ts
- src/services/supabase.ts
```

#### 4. 分析問題
```
- 檢查 OAuth 實作邏輯
- 檢查錯誤處理
- 檢查回調處理
- 檢查環境變數
```

#### 5. 提供解決方案
```
- 改進錯誤處理
- 新增 session 驗證
- 改進使用者體驗
- 建立檢查清單文檔
```

#### 6. 實施修復
```
- 修改 AuthCallback.vue
- 修改 AuthModal.vue
- 建立文檔檔案
- 更新 README.md
```

#### 7. 驗證和提交
```
- 執行 type-check
- 執行 diagnostics
- git add .
- git commit
- git push
```

---

## 🎓 學習資源

### Vue 3 + TypeScript
- [Vue 3 官方文檔](https://vuejs.org/)
- [Pinia 官方文檔](https://pinia.vuejs.org/)

### Supabase
- [Supabase 官方文檔](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)

### 安全性
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [DOMPurify](https://github.com/cure53/DOMPurify)

---

**建立日期**：2026-01-14  
**維護者**：Kiro AI Assistant  
**用途**：幫助 Antigravity 快速理解和處理 TravelMate 專案
