# TravelMate 旅程規劃協作應用

![TravelMate Banner](https://via.placeholder.com/1200x400?text=TravelMate+Next-Gen+Trip+Planner)

TravelMate 是一款專為現代旅人打造的跨平台、高性能旅程規劃應用。結合了 AI 智慧推薦、實時地圖協作、多人分帳記帳與出發前準備清單，讓您的每一次旅行都能從規劃階段就享受到極致與直覺的體驗。

---

## 🌟 主要功能

### 🗺️ 智慧行程與動態地圖
- **單日行程地圖**：地圖 Marker 與行程列表實時聯動，支援高亮顯示與自動選中中心。
- **全球地理服務**：整合 OpenCage 與 Nominatim，提供全球範圍的地址自動補完與精準地標檢索。
- **拖曳排序**：極其流暢的 VueDraggable 景點排序，支援樂觀更新與失敗復原。
- **地圖總覽模式**：快速切換天數，一目了然整場旅程的空間分佈。

### 🤖 AI 行程助手
- **智慧景點推薦**：基於 Google Gemini 2.5 Flash 模型，輸入目的地即可獲得 5 個必去景點建議。
- **一鍵加入行程**：AI 推薦內容包含說明與圖示，點擊即可無縫插入您的每日規劃中。

### 💰 協作記帳與匯率系統
- **多幣值支援**：串接 ExchangeRate-API，提供全球主流貨幣的實時匯率（具備 24 小時快取機制）。
- **共用與個人模式**：每筆支出皆可選擇「團隊分攤」或「個人自付」，確保私密性與公帳清晰。
- **專業結算的對帳**：視覺化的債務/債權清冊，一鍵確認收款狀態，徹底告別旅途後的算帳煩惱。

### 🎒 準備清單與成員協作
- **極簡記事本**：採用 UI/UX Pro Max 規範改版，移除 Emoji 全面改用 SVG，提供極簡且專業的備忘體驗。
- **成員邀請系統**：透過專屬邀請碼連結，輕鬆邀請旅伴加入，支援 Supabase Realtime 即時同步。
- **倒數計時器**：精緻的動態倒數組件，讓您隨時感受出發的脈動。

---

## 🚀 技術棧

- **前端**：Vue 3 (Composition API) + TypeScript + Pinia
- **樣式**：Tailwind CSS (自定義 UI/UX Pro Max 規範)
- **地圖**：Leaflet.js
- **後端**：Supabase (Auth, DB, Storage, Realtime)
- **AI**：Google Gemini AI
- **API**：OpenCage (Geocoding), ExchangeRate-API (Currency)

---

## 🛠️ 安裝與啟動

### 1. 複製專案
```bash
git clone https://github.com/unizalin/travelMate.git
cd travelMate
```

### 2. 安裝依賴
```bash
npm install
```

### 3. 環境變數設定
請在根目錄建立 `.env` 檔案並填入以下資訊：
```env
VITE_SUPABASE_URL=您的_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=您的_SUPABASE_ANON_KEY
VITE_OPENCAGE_API_KEY=您的_OPENCAGE_API_KEY
VITE_GEMINI_API_KEY=您的_GEMINI_API_KEY
```

### 4. 啟動開發伺服器
```bash
npm run dev
```

---

## 📂 專案結構

```text
src/
├── assets/          # 靜態資源、CSS
├── components/      # Vue 組件
│   ├── common/      # 通用、小型組件
│   ├── trip/        # 行程業務核心組件
│   ├── map/         # Leaflet 地圖封裝
│   ├── ui/          # Pro Max 標準化 UI 元素
│   └── modals/      # 彈窗與表單
├── composables/     # Hooks / 組件邏輯提取
├── services/        # 外接 API 與 Supabase 服務層
├── stores/          # Pinia 狀態管理
├── views/           # 路由頁面主體
└── types/           # 全域 TypeScript 型別
```

---

## � 功能進度 (Roadmap)

- [x] **Phase 1-2**: 認證系統與旅程 CRUD
- [x] **Phase 3-4**: 地圖聯動與景點交互
- [x] **Phase 5**: AI 助手與地理服務
- [x] **Phase 6**: 分享碼與成員邀請
- [x] **Phase 7**: 多幣值記帳與結算系統
- [x] **Phase 8**: 極簡記事本 UI 重塑
- [ ] **Next**: Supabase Storage 圖片上傳 (景點、收據)
- [ ] **Next**: 多人即時共同編輯優化

---

## � 常見問題 (FAQ)

**Q: 為什麼地圖 Marker 沒有顯示？**
A: 請檢查該景點是否包含有效的座標（Latitude/Longitude），或者檢查 OpenCage API Key 是否正確。

**Q: 匯率是實時的嗎？**
A: 是的，我們串接了 ExchangeRate-API，並在本地端進行了 24 小時的智能快取，以平衡速度與準確度。

---

**最後更新**：2026-01-13
**版本**：v1.5.0
**作者**：Uniza Lin
