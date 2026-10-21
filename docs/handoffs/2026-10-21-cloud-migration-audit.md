# travelMate 雲端 Supabase migration 盤點與停點（2026-10-21）

## 專案與操作結果

- 雲端 project ref：`yoyvpgbahhnqbuhcarnh`。工作區：`/Users/unizalin/.codex/worktrees/travelmate-tripbook/travelMate`，分支 `codex/tripbook-continue-20261013`，基底 HEAD `eb16f91`。
- Supabase CLI 已存在：`2.67.1`，本次沒有安裝。CLI 登入與 `supabase link --project-ref yoyvpgbahhnqbuhcarnh` 成功；驗證碼及憑證未寫入交接文件。
- `supabase migration list --linked` 顯示本機 11 個版本、雲端紀錄全部空白。唯讀匯出雲端 `public` 與 `auth` schema 進行物件盤點；沒有匯出使用者資料。
- **沒有執行 migration repair、db push、drop、reset 或 App 部署。** 原因：第二支 migration `20260203000000` 的物件「部分存在」，依本次任務要求立即停止，不能把它標為已套用，也不能直接重跑。

## 逐支盤點與最終狀態

| 版本 | 雲端現況 | 最終處理 |
| --- | --- | --- |
| `20240101000000_init_schema` | 主要物件存在：12 張基礎表、34 個政策、7 個索引、4 個函式及 `auth.users` 新使用者觸發器均可見；但未做逐行定義等價審核。此 migration 開頭含多個 `DROP TABLE ... CASCADE`，絕不能對現有資料直接重跑。 | 未 repair；因後續版本部分存在而停下。 |
| `20260203000000_world_map_feature` | **部分存在**：`destinations` 表、公開讀取政策與 `trips.is_public` 已存在；`trips.location_lat`、`trips.location_lng`、`trips.likes_count` 缺失。種子資料未盤點。 | **阻塞點**；未 repair、未 push、未修補雲端。 |
| `20261013020000_tripbook_journey_staging` | `tripbook_journeys`、`tripbook_journey_access` 及該版本 RPC 均未見。 | 未處理；受前述阻塞。 |
| `20261015030000_tripbook_shared_memos` | Memo RPC 未見。 | 未處理；受前述阻塞。 |
| `20261015040000_tripbook_identity_flights` | `tripbook_member_claims`、`tripbook_flight_choices` 及 roster／航班 RPC 未見。 | 未處理；受前述阻塞。 |
| `20261015050000_tripbook_photo_preferences` | `tripbook_member_photo_preferences` 及 RPC 未見。 | 未處理；受前述阻塞。 |
| `20261016060000_tripbook_packing_checklist` | `tripbook_packing_items`、`tripbook_packing_completions` 及載入／勾選 RPC 未見。 | 未處理；受前述阻塞。 |
| `20261016061000_tripbook_packing_template_access` | `tripbook_ensure_packing_template` 未見。 | 未處理；受前述阻塞。 |
| `20261019010000_tripbook_activity_comments` | `tripbook_activity_comments` 及留言 RPC 未見。 | 未處理；受前述阻塞。 |
| `20261020010000_tripbook_shared_london` | 倫敦行程 RPC 未見。 | 未處理；受前述阻塞。 |
| `20261021010000_tripbook_packing_departure_category` | 目標 `tripbook_packing_items` 表尚不存在，因此分類 CHECK 也不存在。 | 未處理；受前述阻塞。 |

## 驗證與限制

- 已驗證：CLI 能登入及連結指定 ref；雲端 migration 紀錄 11 支皆空白；雲端 `public` 共 13 張表（12 張基礎表加 `destinations`），沒有 `tripbook_*` 表／函式；world map 三個欄位缺失；`auth.users` 新使用者觸發器存在。
- 未驗證：`tripbook_packing_items`、`tripbook_packing_completions`、相關 RPC 或「出發前」CHECK，因為這些物件尚不存在。也無法驗證登入版自動補種 49 項、警告消失或跨帳號勾選。當前 worktree 的 `.env.local` 指向本機 `127.0.0.1:54321`，不能把其瀏覽器畫面當作此雲端專案的驗證。
- 下次必須先制定對 `20260203000000` 部分存在狀態的正式遷移／對齊方案，並完成基礎版本定義核對。確認安全後再依序 repair 已完整存在的版本與 push 未套用版本；在此之前不得執行含 `DROP TABLE ... CASCADE` 的初始 migration。
- CLI `link` 更新了 worktree `supabase/.temp` 的版本快取；既有未提交程式變更均保留。本次未修改程式碼、未 commit、未部署 App。完整模型版本與推理等級未提供。
