# 專案技能使用指南 (Expert Skills Guide)

本專案配置了一系列專屬技能，旨在透過「規格驅動開發 (SDD)」模式，確保程式碼品質與架構穩健性。

## 一鍵啟動 (Master Trigger)

如果您想要我一次動推動所有專家角色，只需使用以下這句話：

> **「請啟動專家協作流程，幫我規劃並執行：[您的需求]」**

當我收到這句話時，我會自動按照 **PM -> Architect -> Tasks -> Implement** 的順序，依次讀取對應技能並產出文件。

## 專家角色 (Expert Roles)

| 技能名稱 | 角色 | 職責 | 關鍵產出 |
| :--- | :--- | :--- | :--- |
| `product-manager` | **PM** | 需求分析、細化、使用者故事 | `.specs/01_requirements.md` |
| `system-design` | **架構師** | 技術架構、資料建模、流程圖 (Mermaid) | `.specs/02_architecture.md` |
| `ui-ux` | **設計師** | 介面美學、微互動、Pro Max 風格 | UI Implementation |
| `spec-kit` | **工作流程** | 協調 SDD 四大階段 (Specify -> Plan -> Tasks -> Implement) | `.specs/` 目錄結構 |
| `vue3-frontend-dev` | **前端開發** | 高品質 Vue 3 實作、利於維護的架構 | SFCs, Composables |
| `supabase-commander` | **後端/DB** | 資料庫遷移、RLS 權限、Edge Functions | Migration Files |
| `test-engineer` | **測試工程師** | 單元測試、整合測試、QA | Test Suites |

## 推薦協作流程 (Unified Workflow)

### 1. 需求定義階段 (Specify)
- **指令**：「請用 PM 模式幫我規劃 [功能名稱]。」
- **行為**：Agent 會切換至 `product-manager` 模式，分析需求並產出 specs。

### 2. 架構設計階段 (Plan)
- **指令**：「需求已確認，請執行系统設計。」
- **行為**：Agent 會切換至 `system-design` 模式，繪製 Mermaid 圖表並更新架構文件。

### 3. 任務拆解階段 (Tasks)
- **指令**：「請根據架構拆解實作任務。」
- **行為**：基於 `spec-kit` 产出細項清單於 `03_task_plan.md`。

### 4. 程式碼實作階段 (Implement)
- **指令**：「開始執行任務。」
- **行為**：Agent 會調動 `ui-ux`、`vue3-frontend-dev` 等技能開始寫 code，並利用新的 **Sandbox 沙盒環境** 安全執行指令。

## 小撇步 (Tips)
- **Nano Banana Pro**: 當你需要圖表時，架構師會自動利用該模型生成精美的 Mermaid 圖表。
- **WOW Factor**: 如果希望介面更有質感，請隨時提醒：「請套用 UI/UX Pro Max 準則」。
- **Sandbox**: 現在所有的終端操作都會在沙盒中執行，安全性大幅提升。
