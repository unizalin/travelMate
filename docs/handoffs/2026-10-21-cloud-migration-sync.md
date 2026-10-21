# travelMate 雲端 Supabase migration 同步完成（2026-10-21 第二階段）

承接 `2026-10-21-cloud-migration-audit.md`。雲端 ref `yoyvpgbahhnqbuhcarnh`，CLI `2.67.1`（沿用既有登入與 link）。工作區 `/Users/unizalin/.codex/worktrees/travelmate-tripbook/travelMate`，分支 `codex/tripbook-continue-20261013`，HEAD `eb16f91`。未改程式、未 commit、未部署 App；既有未提交變更全數保留。

## 1. 備份（專案外）

路徑 `~/travelmate-backups/20261021-cloud/`（即 `/Users/unizalin/travelmate-backups/20261021-cloud/`）：

- `20261021_schema.sql`：變更前 public schema
- `20261021_data.sql`：變更前資料（`--data-only`）
- `20261021_roles.sql`：角色
- `20261021_auth_schema.sql`：auth schema（核對觸發器用）
- `20261021_schema_after_worldmap.sql`、`20261021_schema_after_push.sql`：各階段後的核對快照

## 2. 逐支最終狀態

| 版本 | 處理方式 | 最終狀態 |
| --- | --- | --- |
| `20240101000000_init_schema` | 依備份逐一核對：12 張表、34 個政策（名稱逐一比對）、4 個函式、7 個索引、12 表 RLS、`auth.users` 的 `on_auth_user_created` 觸發器皆存在，無缺失。**未重跑**，只 `migration repair --status applied`。雲端另有額外物件（`is_member_of`、`is_trip_member` 另一多載、兩個 updated_at 觸發器、`trips.cover_image_url`），未動。 | applied（repair） |
| `20260203000000_world_map_feature` | 「Public can view destinations」政策已存在 → 不建；`destinations` 已有 10 列 → 不跑種子。只補 trips 三欄：使用者於 Dashboard SQL Editor 執行原檔的三行 `ADD COLUMN IF NOT EXISTS`（本機 CLI 2.67.1 無執行任意 SQL 指令、也無真正 psql）。重新 dump 確認 `location_lat`、`location_lng`、`likes_count DEFAULT 0` 存在後 repair。 | applied（補欄＋repair） |
| `20261013020000_tripbook_journey_staging` | `db push`（先 `--dry-run` 確認恰好 9 支、順序正確） | applied |
| `20261015030000_tripbook_shared_memos` | `db push` | applied |
| `20261015040000_tripbook_identity_flights` | `db push` | applied |
| `20261015050000_tripbook_photo_preferences` | `db push` | applied |
| `20261016060000_tripbook_packing_checklist` | `db push` | applied |
| `20261016061000_tripbook_packing_template_access` | `db push` | applied |
| `20261019010000_tripbook_activity_comments` | `db push` | applied |
| `20261020010000_tripbook_shared_london` | `db push` | applied |
| `20261021010000_tripbook_packing_departure_category` | `db push` | applied |

push 過程無錯誤，只有 `DROP ... IF EXISTS` 對不存在物件的正常 NOTICE（skipping）。

## 3. 驗證

- 已驗證：`supabase migration list --linked` 11 支 Local/Remote 全部對齊。push 後 dump 顯示 8 張 `tripbook_*` 表（含 `tripbook_packing_items`、`tripbook_packing_completions`），打包 RPC `tripbook_load_packing_items`、`tripbook_set_packing_completion`、`tripbook_ensure_packing_template`、`tripbook_initialize_packing`、add/update/delete 皆存在；`tripbook_packing_items_category_check` 為 `'出發前','必帶','衣服','盥洗','其他'`。
- **未驗證**：App 重新整理後補種 49 項、「範本暫時無法更新」警告消失。原因：worktree `.env.local` 的 `VITE_SUPABASE_URL` 指向本機 `127.0.0.1:54321`，本機畫面不代表雲端；且需旅伴帳號登入，本次未執行瀏覽器登入流程。跨帳號勾選、RLS 實際行為同樣未驗證。

## 4. 下一步

1. 用指向雲端的環境變數（或已部署站）以旅伴帳號登入，確認行前清單 49 項與警告消失；第二帳號驗證共用勾選。
2. 確認後才發布前端（本次未部署）。
3. 回復手段：如需回退，以上述備份為準；不得重跑含 `DROP TABLE ... CASCADE` 的 init migration。
