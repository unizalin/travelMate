---
name: ui-ux
description: 專門用於設計和實作頂級、現代化且以使用者為中心的「UI/UX Pro Max」網頁介面。
---

# UI/UX Pro Max 設計技能

此技能指導 Agent 創建「UI/UX Pro Max」等級的介面。目標是透過頂級的美學、流暢的動畫和直觀的體驗，讓使用者第一眼就感到驚艷 (WOW factor)。

## 核心設計理念

1.  **頂級美學 (Premium Aesthetics)**：拒絕通用和廉價的設計。使用精心挑選的配色方案、玻璃擬態 (Glassmorphism) 和細膩的漸層。
2.  **排版至上 (Typography Matters)**：使用變體字型 (Variable Fonts)，設定適當的行高（內文 1.5，標題 1.2）和字距來建立清晰的視覺層級。
3.  **靈動介面 (Alive Interfaces)**：每個互動元素都必須提供反饋（懸停、點擊、聚焦）。內容應透過流暢的淡入/滑動動畫呈現。
4.  **極簡與留白 (Minimalism & Whitespace)**：避免雜亂。使用留白來引導視覺動線。

## 設計系統指南 (Design System Guidelines)

### 1. 排版 (Typography)
-   **標題**：大膽、突出。使用現代無襯線字體 (如 Inter, Outfit, Plus Jakarta Sans)。
-   **內文**：易讀，高對比度但不使用純黑（避免 #000000，改用 #1A1A1A 或深灰色）。
-   **字重**：善用不同字重 (Light, Regular, Medium, SemiBold, Bold) 來建立層級。

### 2. 色彩 (Colors)
-   **主色**：定義明確的品牌主色。
-   **表面色 (Surface)**：使用多種深淺的背景色 (Surface 100, 200, 300) 來創造深度。
-   **強調色 (Accents)**：謹慎使用於行動呼籲 (CTA)。
-   **深色模式 (Dark Mode)**：確保設計在深色模式下依然驚艷（通常使用深藍色或深灰色，而非純黑）。

### 3. 間距與佈局 (Spacing & Layout)
-   **網格**：使用流體網格系統。
-   **間距**：使用一致的間距比例 (4px, 8px, 16px, 24px, 32px, 48px, 64px)。

### 4. 特效 (The "Pro Max" Touch)
-   **玻璃擬態 (Glassmorphism)**：背景模糊 (Backdrop blur)、半透明背景、使用 `rgba(255, 255, 255, 0.1)` 製作細緻邊框。
-   **陰影**：柔和、多層次的陰影。避免僵硬、深黑的陰影。
-   **漸層**：使用細微的網格漸層 (Mesh Gradients) 或方向性漸層，為平面增添生命力。

## 實作流程 (Implementation Workflow)

1.  **分析與規劃 (Analyze & Plan)**：
    -   確認該畫面的關鍵使用者行為。
    -   選擇合適的佈局模式。

2.  **架構 (Scaffold)**：
    -   使用語意化標籤建立 HTML 結構。
    -   套用基礎樣式。

3.  **樣式設計 (Style)**：
    -   套用 "Pro Max" 美學。
    -   *注意*：如果專案使用 Tailwind CSS，請善用它來實現這些效果。如果使用 Vanilla CSS，請編寫高品質的 CSS。

4.  **動畫 (Animate)**：
    -   加入頁面載入的進場動畫 (如 `staggered-fade-in`)。
    -   加入按鈕和卡片的微互動 (縮放、發光、位移)。

5.  **審查 (Review)**：
    -   響應式是否良好？
    -   是否符合無障礙標準？
    -   **是否感覺「高級」？**

## 可重用程式碼片段 (概念性)

### 玻璃卡片 (Glass Card)
```css
background: rgba(255, 255, 255, 0.05);
backdrop-filter: blur(16px);
border: 1px solid rgba(255, 255, 255, 0.1);
box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
border-radius: 1rem;
```

### 平滑過渡 (Smooth Transition)
```css
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```

## 何時使用此技能
-   當使用者要求「讓它看起來更好」時。
-   當開發需要前端介面的新功能時。
-   當使用者明確提到 "UI/UX"、"設計"、"重設計" 或 "美學" 時。
-   當使用者提到 "UI/UX Pro Max" 時。
