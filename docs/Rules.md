# TravelMate 開發規範 (Rules)

## 1. 代碼風格規範
- **框架**：使用 Vue 3 Composition API (`<script setup>`)。
- **程式語言**：強制使用 TypeScript。
- **UI 組件**：組件應盡可能拆分為細粒度、可重用的組件。
- **CSS**：使用 Tailwind CSS 工具類（Utility Classes），避免在檔案內撰寫自定義 CSS，除非必要（使用 `<style scoped>`）。

### 代碼示例
```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useToast } from '@/composables/useToast';

const props = defineProps<{ title: string }>();
const { showToast } = useToast();
// ...邏輯區
</script>

<template>
  <div class="p-4 bg-white rounded-lg shadow-sm">
    <h3 class="text-lg font-bold">{{ title }}</h3>
  </div>
</template>
```

## 2. 命名規範
- **組件檔案**：使用 PascalCase（大駝峰），例如 `AddActivityModal.vue`。
- **一般檔案**：使用 camelCase（小駝峰），例如 `tripService.ts`。
- **變數與函式**：使用 camelCase，例如 `const isLoading = ref(false)`。
- **常量**：使用 UPPER_SNAKE_CASE，例如 `const API_DOMAIN = '...'`。

## 3. 資料夾結構規範
所有代碼位於 `src/` 目錄下：
- `components/`: 分類存放 Vue 組件
  - `common/`: 通用、小型組件
  - `trip/`: 行程業務相關組件
  - `map/`: 地圖相關組件
  - `ui/`: 基礎 UI 元素（Button, Dialog...）
  - `modals/`: 彈窗形式的表單或對話
- `views/`: 頁面級組件
- `services/`: API 呼叫、外部第三方整合（如 Supabase, Gemini）
- `stores/`: Pinia 狀態管理
- `composables/`: 封裝好的 Composition API (Hooks)
- `utils/`: 通用工具函式

## 4. Import 路徑規範
- 強制使用 `@` Alias 指向 `src/` 目錄。
- 禁止使用深度超過一層的相對路徑（不要使用 `../../../`）。

```typescript
// ✅ 正確
import MapView from '@/components/map/MapView.vue';
import { supabase } from '@/services/supabase';

// ❌ 錯誤
import MapView from '../../components/map/MapView.vue';
```

## 5. Git Commit 規範
訊息應符合 Conventional Commits 格式：
- `feat`: 新增功能
- `fix`: 修復錯誤
- `refactor`: 重構代碼（無功能變化）
- `docs`: 修改文件
- `style`: 程式碼格式化（不影響邏輯）
- `chore`: 建置過程或輔助工具的變動

**範例**：`refactor: reorganize project folder structure`

## 6. 開發流程
1. **開發**：按照任務清單實作功能。
2. **測試**：執行 `npm run build` 確保類型檢查與打包無誤。
3. **Commit**：撰寫標準化的 Commit 訊息。
4. **Push**：推送到遠端儲存庫。

---
**最後更新**：2026-01-09
**版本**：1.1.0
