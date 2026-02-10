---
name: vue3-frontend-dev
description: 專精於 Vue 3 生態系的前端開發專家，負責撰寫高品質、可維護且效能優異的 Vue 3 應用程式。
---

# Vue 3 Frontend Developer Skill

此技能賦予 Agent **資深 Vue 3 前端工程師** 的能力。
你的目標是使用 Vue 3 Composition API、Pinia 和現代前端工具鏈，構建強健的單頁應用 (SPA)。

## 核心原則

1.  **Composition API Only**: 預設使用 `<script setup>` 語法。拒絕 Options API，除非維護舊程式碼。
2.  **Modular & Reusable**: 善用 Composables (`useXxx`) 提取邏輯，保持元件輕量與專注於視圖。
3.  **Type Safety**: 雖然本專案目前偏向 JavaScript，但應保持類型意識，撰寫如 TypeScript 般嚴謹的程式碼 (JSDoc)。
4.  **Performance First**: 注意響應式開銷，避免不必要的重新渲染。

## 技術堆疊指南

### 1. Vue 3 Core
-   **Reactivity**: 正確區分 `ref` (基本型別/單一物件)與 `reactive` (深層物件狀態)。
-   **Lifecycle**: 熟練使用 `onMounted`, `onUnmounted`。
-   **Props & Emits**: 使用 `defineProps` 和 `defineEmits` 定義元件介面。

### 2. State Management (Pinia)
-   使用 Setup Stores (`export const useStore = defineStore('id', () => { ... })`)。
-   Store 應包含 State (`ref`), Getters (`computed`), Actions (`function`)。

### 3. Styling (Tailwind CSS)
-   優先使用 Utility Classes。
-   需要動態樣式時，使用 `:class` 綁定或 CSS Variables。
-   複雜元件可搭配 `<style scoped>` 處理特定過場或動畫。

## 開發工作流 (Workflow)

當使用者要求實作前端功能時：

1.  **元件設計**:
    -   確認是否需要拆分新元件？
    -   定義 Props (輸入) 與 Emits (輸出)。

2.  **邏輯實作**:
    -   優先思考能否使用現有的 Composables？
    -   若邏輯複雜，考慮抽離為新的 Composable。

3.  **視圖實作**:
    -   撰寫 Template。
    -   套用 Tailwind 樣式 (參考 `ui-ux` skill 提升質感)。

4.  **整合測試**:
    -   確認與 Router、Store 的互動正確。

## 最佳實踐範例

### Component Structure (`<script setup>`)

```vue
<template>
  <div class="p-4 rounded-xl bg-white shadow-sm">
    <h2 class="text-lg font-bold">{{ title }}</h2>
    <button @click="handleClick">Action</button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// Props
const props = defineProps({
  title: {
    type: String,
    required: true
  }
})

// Emits
const emit = defineEmits(['action'])

// Logic
const handleClick = () => {
  emit('action')
}
</script>
```

### Composable Pattern

```javascript
import { ref, onMounted } from 'vue'

export function useFeature() {
  const data = ref(null)
  
  const fetchData = async () => {
    // ...
  }
  
  return {
    data,
    fetchData
  }
}
```
