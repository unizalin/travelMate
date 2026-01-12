# TravelMate 專案上下文 (Context)

## 專案概要
- **專案名稱**：TravelMate（旅程規劃協作應用）
- **目標**：提供一個直覺、美觀且具備 AI 輔助功能的旅程規劃平台，深度整合地圖動態、多人協作記帳、外幣即時匯率與清單備忘功能。
- **目前開發階段**：功能完備期 (Feature Rich) - 已完成核心系統與 UI/UX 深度優化，進入穩定度提升階段。

## 技術棧 (Tech Stack)

### 前端實作
- **核心框架**：Vue 3 (Composition API) + TypeScript
- **狀態管理**：Pinia (store 模式處理異步數據與共享狀態)
- **樣式與設計**：Vanilla CSS + Tailwind CSS (實施 UI/UX Pro Max 規範)
- **地圖引擎**：Leaflet.js (處理 Marker 渲染、日曆聯動、座標更新)
- **拖曳排序**：VueDraggable (Next) (用於行程卡片排序)
- **UI 組件**：Headless UI + Heroicons (SVG 圖示系統)

### 後端與服務
- **後端平台**：Supabase (Auth, PostgreSQL, Realtime, RLS 權限管理)
- **AI 助手**：Google Gemini 2.5 Flash (用於景點推薦與自動化行程排版)
- **地理空間服務**：OpenCage API / Nominatim (處理地址自動補完與座標正規化)
- **財富計算**：ExchangeRate-API (提供 24 小時快取的實時匯率數據)

## 核心功能清單

### 🌍 行程與地圖
- **旅程總覽**：視覺化的旅程卡片與倒數計時器。
- **每日行程地圖**：地圖與行程列表雙向連動，支持 Marker 高亮顯示。
- **地圖總覽模式**：快速篩選不同天數的景點分佈。
- **動態管理**：景點的新增、編輯、刪除以及流暢的拖曳排序。
- **全球地理服務**：支援全球地址搜尋自動補完。

### 💰 費用與財務 (新)
- **協作記帳**：區分「團隊共用」與「個人私有」模式。
- **多幣值處理**：支援全球主流貨幣，整合實時匯率進行換算。
- **結算系統**：視覺化的對帳清單、債務/債權清晰呈現、收款狀態確認。
- **類 Note 界面**：極簡、高效的記帳與記事體驗。

### 📋 協作與準備
- **出發記事本**：UI/UX Pro Max 改版，移除 Emoji 全面改用 SVG，支援共用與個人備忘。
- **成員邀請**：專屬邀請碼連結分享，快速加入旅伴。
- **AI 推薦系統**：根據城市自動推薦五個必去景點並一鍵加入。

## 資料庫架構 (Supabase)
- `profiles`: 使用者資訊。
- `trips`: 旅程基礎資料（包括邀請碼）。
- `trip_members`: 成員權限關係。
- `itineraries`: 每日行程容器。
- `activities`: 景點、餐廳與住宿項目的詳細資料與座標。
- `expenses` & `expense_payments`: 記帳表與支付狀態拆解。
- `preparation_items`: 出發前的清單備忘。

---
**最後更新日期**：2026-01-13
**版本**：v1.0.0 (Gold Master Candidate)
