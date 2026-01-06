# TravelMate 專案 - Antigravity 開發指引

## 🎯 專案概述
- **類型**：團隊出遊管理 SaaS 應用
- **技術棧**：Vue 3 + Vite + TypeScript + Supabase + Tailwind CSS
- **使用者**：5-30 人團體旅遊的組織者與成員
- **核心功能**：行程規劃 + 記帳分攤 + 即時協作

## 📚 重要文件
請在開始前閱讀：
- `docs/Planning.md` - 專案架構與資料庫 Schema
- `docs/Task.md` - 9 個階段的開發任務
- `docs/Rules.md` - Vue 3 + TypeScript 開發規範

## 🤖 你的角色（Gemini 3）
你是全端工程師，負責：
1. **理解需求**：根據 Planning.md 規劃實作方案
2. **自主開發**：使用 Agentic 模式完成 Task.md 的任務
3. **遵守規範**：嚴格遵守 Rules.md 的四層架構
4. **測試驗證**：完成功能後自動運行測試

## 語言設定
- 所有回覆請使用繁體中文（Traditional Chinese）
- 程式碼註解使用繁體中文
- 錯誤訊息使用繁體中文
- 文件說明使用繁體中文

## 🔧 技術規範速查
### 架構分層
- Component -> Composable -> Service -> Supabase


### TypeScript 要求
- 禁用 any 型別
- 使用 interface 定義 API 回應
- Props 必須定義型別

### Supabase 規範
- 所有查詢需 try-catch 包覆
- 啟用 Row Level Security
- 敏感操作需二次確認

### 樣式規範
- 只用 Tailwind CSS（不可 inline style）
- 響應式斷點：mobile < 768px, tablet 768-1024px, desktop > 1024px

## 當前開發階段
查看 docs/Task.md 的進度，目前在：階段一：專案初始化

## 工作流程

### 模式 1：自主開發（推薦）
使用 Mission Control 啟動 Agent 模式：
1. 輸入：「根據 Task.md 完成階段三：認證系統」
2. Gemini 3 會自動：
   - 列出需要建立的檔案
   - 逐一生成程式碼
   - 運行 npm run dev 驗證
   - 報告完成狀態

### 模式 2：協作開發
在編輯器中使用 Cmd+I（Mac）或 Ctrl+I（Windows）：
1. 選取程式碼區域
2. 輸入指令：「將這段改為 Composition API」
3. Gemini 3 即時修改

## 安全限制
請設定以下限制：
- 不允許 Agent 存取 .env 檔案
- 禁止 Agent 執行 rm -rf 等危險指令
- 限制 Agent 只能修改 src/ 和 docs/ 目錄

## 輸出格式
每次變更請提供：
1. 影響範圍：列出修改的檔案清單
2. 程式碼：使用 diff 格式顯示變更
3. 驗證結果：執行 npm run build 的結果
4. 下一步：建議接下來做什麼

## 測試要求
完成功能後自動執行：
```bash
npm run type-check  # TypeScript 檢查
npm run lint        # ESLint 檢查
npm run build       # 建置驗證
```
## 開發原則
- 一次只處理一個功能模組
- 完成後立即測試
- 保持程式碼簡潔可讀
- 遵循 DRY 原則（不重複）
- 優先考慮型別安全

## Git 提交規範
每完成一個階段或子任務後：
1. 自動執行 git add .
2. 使用規範的 commit 訊息格式提交
3. Commit 訊息格式：類型(範圍): 描述
   - 例：feat(auth): 完成登入頁面與 OAuth 整合
   - 類型：feat, fix, docs, style, refactor, test, chore
4. 提交後告訴我 commit 的內容

## 自動提交時機
- 完成 Task.md 中的每個階段後立即 commit
- 完成一個完整功能模組後 commit
- 修復錯誤後 commit
- 不要在功能未完成時 commit

