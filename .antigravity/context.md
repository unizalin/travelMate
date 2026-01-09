# TravelMate 專案上下文 (Context)

## 專案概要
- **專案名稱**：TravelMate（旅程規劃應用）
- **目標**：提供一個直覺、協作且具備 AI 輔助功能的旅程規劃平台，整合地圖與記帳功能。
- **目前開發階段**：地圖整合與 UI/UX 優化（剛完成專案結構重構）

## 技術棧 (Tech Stack)
- **前端框架**：Vue 3 (Composition API) + TypeScript
- **狀態管理**：Pinia
- **樣式工具**：Tailwind CSS
- **地圖驅動**：Leaflet
- **AI 服務**：Google Gemini AI
- **後端服務**：Supabase (Auth, Database, Storage, Realtime)
- **拖曳功能**：VueDraggable (Next)
- **UI 組件**：Headless UI + Heroicons

## 功能清單

### ✅ 已完成功能
- **認證系統**：Email 註冊登入、LINE/Google 第三方登入、路由守衛。
- **旅程管理**：建立旅程、邀請成員、旅程列表、詳情查看。
- **行程規劃**：每日行程視圖、景點新增/編輯/刪除、拖曳排序。
- **地圖功能**：景點 Marker 顯示、自動定位中心、行程概覽地圖。
- **AI 助手**：Gemini AI 景點推薦、自動加入行程。
- **地理編碼**：地址自動完成 (Geocoding Service)、座標轉換。
- **基礎設施**：專案結構重構（組件分類化）、使用 `@` Alias 路徑。

### 🚧 進行中的功能
- **UI 優化**：彈窗互動改善、轉場動畫、響應式斷點微調。
- **天氣預報**：OpenWeatherMap 串接與快取優化。
- **離線支援**：基礎的資料快取與讀取。

### 📅 待開發的功能 (Next)
- **記帳系統**：分帳計算、外幣轉換、收據圖片上傳。
- **即時協作**：多人同時編輯同一份行程的同步顯示 (Supabase Realtime)。
- **PDF 匯出**：生成美觀的 PDF 行程單。
- **進階地圖**：路線導航、附近景點推薦。

---
**最後更新日期**：2026-01-09
**版本**：v0.5.0
