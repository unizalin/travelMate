---
name: supabase-commander
description: Standardized workflow for Supabase development, migration, and deployment.
---

# Supabase Commander (DevOps)

此 Skill 提供標準化的 Supabase 開發流程，確保資料庫遷移、型別生成與 Edge Function 部署的一致性。你的角色是 **Backend/DevOps 工程師**，負責維護資料庫的健康與 CI/CD 流程。

## 核心能力 (Core Capabilities)

### 1. 資料庫遷移 (Database Migration)
**`dev:migration`**
自動比較本地與遠端 (或目前開發環境) 的 Schema 差異，產生 Migration 檔案。
- **時機**: 當你修改了 Table 結構 (SQL) 後，需要產生對應的 migration file。
- **指令**:
  ```bash
  npx supabase db diff -f <descriptive_name>
  ```
- **注意**: 產生的檔案位於 `supabase/migrations`。請務必檢查內容是否正確。

### 2. 型別同步 (Type Synchronization)
**`dev:types`**
根據目前的資料庫 Schema 自動生成 TypeScript 型別定義，供前端使用。
- **時機**: 每次 Schema 變更 (Migration) 後**必須**執行，以確保前端獲得最新的型別提示。
- **指令**:
  ```bash
  npx supabase gen types typescript --local > src/types/supabase.ts
  ```

### 3. Edge Function 部署 (Function Deployment)
**`deploy:function`**
部署 Edge Functions 到專案。
- **時機**: 當修改了 `supabase/functions` 下的程式碼時使用。
- **指令**:
  ```bash
  npx supabase functions deploy <function_name> --no-verify-jwt
  ```
- **注意**: 若 Function 需要環境變數，請確保遠端專案已設定 (Secrets)。

### 4. 本地開發環境 (Local Development)
管理本地 Supabase 服務。
- **啟動**: `npx supabase start` (啟動 Docker 容器)
- **停止**: `npx supabase stop` (停止並保留資料)
- **重置**: `npx supabase db reset` (清空資料庫並重新套用所有 Migrations)

## 最佳實踐 (Best Practices)

1.  **Always use Migrations**: **絕對禁止**在 Supabase Dashboard 直接修改 Table 結構。所有變更都必須透過 Migration 檔案進行版控。
2.  **Sync Types Immediately**: 產生 Migration 後，立即更新 Types (`src/types/supabase.ts`)，避免前後端型別不一致。
3.  **Check RLS**: 新增 Table 後，務必檢查 Row Level Security (RLS) Policy 是否啟用且設定正確。預設情況下 Supabase 會啟用 RLS 但不允許任何存取。
4.  **Seed Data**: 使用 `supabase/seed.sql` 儲存開發用的初始資料。

## 常見指令速查

| 動作 | 指令 |
| :--- | :--- |
| 登入 | `npx supabase login` |
| 連結專案 | `npx supabase link --project-ref <project-id>` |
| 推送 Migrations (Remote) | `npx supabase db push` |
| 查看狀態 | `npx supabase status` |
