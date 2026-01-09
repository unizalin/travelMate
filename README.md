# TravelMate 旅程規劃助手

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Vue](https://img.shields.io/badge/vue-3.4.0-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.5.0-blue.svg)

**TravelMate** 是一個直覺、協作且具備 AI 輔助功能的旅程規劃平台。它整合了互動式地圖、智慧行程建議與即時協作功能，旨在讓每次旅行的規劃過程變得輕鬆有趣。

---

## 主要功能

-  **多元認證系統**：支援 Google 第三方快速登入。
-  **互動式地圖**：整合 Leaflet 地圖，自動標記景點位置並規劃每日行程視圖。
-  **AI 行程助手**：串接 Google Gemini AI，根據目的地提供智慧行程建議並一鍵加入。
-  **全球地址搜尋**：整合 OpenStreetMap 地理解碼，提供精準的地點自動完成功能。
-  **拖曳式行程規劃**：直覺的景點排序與跨天數調整（基於 VueDraggable）。
-  **天氣預報摘要**：整合即時天氣服務（開發中）。
-  **協作記帳系統**：支援多人分帳、外幣轉換與結算（開發中）。

---

##  技術棧

| 領域 | 技術 |
| :--- | :--- |
| **前端框架** | Vue 3 (Composition API + `<script setup>`) |
| **語言** | TypeScript (Strict Mode) |
| **狀態管理** | Pinia |
| **CSS 框架** | Tailwind CSS |
| **地圖服務** | Leaflet |
| **AI 引擎** | Google Gemini AI (@google/genai) |
| **後端 & 資料庫** | Supabase (Auth, DB, Storage, Realtime) |
| **UI 組件** | Headless UI + Heroicons |

---

## ⚡ 快速開始

### 1. 複製專案
```bash
git clone https://github.com/unizalin/travelMate.git
cd travelMate
```

### 2. 安裝相依套件
```bash
npm install
```

### 3. 環境變數設定
在根目錄建立 `.env.local` 檔案：
```env
VITE_SUPABASE_URL=你的_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=你的_SUPABASE_ANON_KEY
VITE_GEMINI_API_KEY=你的_GEMINI_API_KEY
VITE_OPENWEATHER_API_KEY=你的_WEATHER_API_KEY
```

### 4. 啟動開發環境
```bash
npm run dev
```

---

## 📂 專案結構

```text
src/
├── components/          # 組件分類
│   ├── common/         # 通用小型組件 (如 WeatherTooltip)
│   ├── trip/           # 行程業務組件 (如 AIAssistant, DayCard)
│   ├── map/            # 地圖功能組件 (如 MapView)
│   ├── ui/             # 基礎 UI 元素 (如 Button, Dialog)
│   └── modals/         # 彈窗形式組件 (如 AddActivityModal)
├── views/              # 頁面級組件
├── services/           # API 封裝與第三方服務 (Supabase, Gemini)
├── stores/             # Pinia 狀態管理
├── composables/        # 封裝好的 Hooks
├── types/              # TypeScript 型別定義
└── utils/              # 通用工具函式
```

---

## 📖 開發指南

### Import 路徑
專案已設定路徑別名，請統一使用 `@`：
```typescript
import MapView from '@/components/map/MapView.vue';
```

### Git Workflow
訊息請遵循 [Conventional Commits](https://www.conventionalcommits.org/) 格式：
- `feat`: 新增功能
- `fix`: 修復錯誤
- `refactor`: 重構代碼
- `docs`: 文檔更新
- `style`: 格式調整

### 常用命令
- `npm run dev`: 啟動開發伺服器
- `npm run build`: 進行類型檢查並打包專案
- `npm run type-check`: 僅執行 TypeScript 檢查
- `npm run lint`: 執行 ESLint 修復

---

## 📊 功能進度表

- [x] 基礎認證與個人資料管理
- [x] 旅程建立與成員邀請碼
- [x] 互動式地圖標記與行程整合
- [x] AI 景點推薦助手
- [x] 景點拖曳排序功能
- [ ] 記帳系統與分帳計算 (進行中)
- [ ] 全球城市即時天氣 (進行中)
- [ ] 多人同時線上編輯 (進行中)

---

## 📝 常見問題 (FAQ)

**Q: 地圖無法正常載入景點？**
A: 請確保該景點已透過地址自動完成功能正確取得緯度 (latitude) 與經度 (longitude)。

**Q: AI 助手沒有回應？**
A: 請檢查 `.env.local` 中的 `VITE_GEMINI_API_KEY` 是否有效。

---
**版本**：v0.5.0
**最後更新時間**：2026-01-09
