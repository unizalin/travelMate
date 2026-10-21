# Theme System Specification

## Overview
Implement a comprehensive theme system supporting Light, Dark, and System modes using Tailwind CSS `class` mode and Vue 3 Composition API.

## Core Components

### 1. Composable: `src/composables/useTheme.ts`
- **State management**: 
  - `theme`: Reactive state (`'light' | 'dark' | 'system'`).
  - `isDark`: Computed boolean indicating if dark mode is active (considers system settings if theme is 'system').
- **Persistence**: Save selection to `localStorage` under key `theme`.
- **System Synchronization**: Listen for `prefers-color-scheme` changes to update UI when in 'system' mode.
- **Application**: Toggle `.dark` class on `document.documentElement`.

### 2. Tailwind Configuration: `tailwind.config.js`
- Ensure `darkMode: 'class'` is set (already confirmed).
- Extend theme with semantic color variables if needed.

### 3. Global Styles: `src/styles/globals.css`
- Core Tailwind directives (`@tailwind base;` etc.).
- Base layer: smooth transitions for background/text colors.
- Component layer: Define shared utility classes like `.glass-card`.

### 4. Root Integration: `src/App.vue`
- Initialize theme system via `useTheme()`.
- Apply base dark/light classes to the main container.

### 5. Settings Interface: `src/views/Profile.vue` (or `SettingsView.vue`)
- Theme selection dropdown/radio.
- Options: Light, Dark, System.
- Live preview indicator.
