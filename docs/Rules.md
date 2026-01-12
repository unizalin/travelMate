# TravelMate 開發規範 (Rules)

## 1. 代碼規範 (Coding Standards)

- **框架與語言**：強制使用 Vue 3 Composition API (`<script setup>`) 與 TypeScript。
- **組件邏輯**：
  - 盡可能提取業務邏輯至 `services/` 或 `composables/`。
  - 使用 `Pinia` 管理跨頁面共享狀態。
- **命名約定**：
  - **Vue 組件**：`PascalCase.vue` (例如 `ExpenseItem.vue`)。
  - **TS 服務與函式**：`camelCase.ts` (例如 `currencyService.ts`)。
  - **變數與常量**：變數 `camelCase`，常量 `UPPER_SNAKE_CASE`。

## 2. 資料夾結構 (Folder Structure)

所有代碼位於 `src/`：
- `components/common/`: 小型通用組件 (Loading, Icon, Badge)。
- `components/trip/`: 核心旅程規劃組件。
- `components/map/`: Leaflet 相關地圖邏輯。
- `components/ui/`: UI/UX Pro Max 標準化組件（Button, Toggle）。
- `components/modals/`: 所有表單與互動彈窗。
- `views/`: 路由頁面主體。
- `services/`: 第三方 API (Supabase, Gemini, OpenCage) 串接層。

## 3. Import 路徑規範

- **強制使用 @ Alias**：指向 `/src` 目錄。
- **禁止深度相對導向**：禁止使用 `../../../../`。
```typescript
import { currencyService } from '@/services/currencyService'; // ✅ 正確
```

## 4. UI/UX Pro Max 設計規範

- **美感原則**：優先考慮「毛玻璃 (Glassmorphism)」、「微動效 (Micro-interactions)」與「豐富層次感」。
- **圖示系統**：全面採用 SVG (Heroicons)，禁止使用過時的 Emoji 作為核心 UI 元素。
- **色彩規範**：使用 `Tailwind CSS` 調色盤，保持 Secondary 900 作為深色背景，Primary 600 作為主要行動色。
- **動畫**：所有 Tab 切換、列表加載需使用 `Transition` 或 `Animate` 類。

## 5. Git Commit 格式

提交訊息必須遵循：
- `feat`: 新增功能。
- `fix`: 修復 Bug。
- `refactor`: 重構（不改變功能）。
- `docs`: 文檔更新。
- `style`: 格式化或樣式微調。

**範例**：`feat: implement multi-currency conversion for shared expenses`

## 6. TypeScript 型別定義

- 數據模型 (Models) 應在對應的 Service 中 define interface。
- 避免使用 `any`。

---
**版本**：2.0.0
**更新於**：2026-01-13
