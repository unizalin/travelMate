# 2026-10-22 固定旅程、邀請、認領與管理後台

## 需求與權限

- 固定倫敦＋冰島一份旅程；無前端建立入口，舊 create/grant/claim RPC 對瀏覽器角色撤權。
- `unizalin@gmail.com` 為固定管理者，已直接綁定 U；其餘固定身分為 jinyo、Kevin Ho か、Rosanne 🌹、YU、思辰。
- 有效邀請連結 + Google 登入 + 名字確認後原子加入，不需核准。一般登入不授權。固定旅程的 can_read/can_edit 只承認擁有者或有效 claim，忽略舊 access grants。
- 管理後台位於私人頁「行前準備」的「旅伴管理後台」，角色與每個操作皆由 RPC 判斷。提供輪替／撤銷邀請、認領狀態與帳號／時間、解除綁定與移除存取；保護建立者 U。
- 一次只有一個 token_hash，token 為 32 隨機 bytes 的 hex。只存 SHA-256，不保存明文。重新載入管理頁不重現舊明文，需產生新連結才可再次複製；新連結立即使舊連結失效。邀請 token／連結不進文件、Git 或本機產物。

## 實作

- Migration `20261022010000`：固定設定表、邀請、後端角色／認領／管理 RPC、冪等 privileged initializer；認領已有 trip/member PK 與 trip/user UNIQUE，新增 claimed_at。更新 Memo 以認領名記錄修改者；新固定旅程只允許四種打包分類。
- Migration `20261022020000`：私人 roster 從授權後的旅程取得固定姓名。
- Migration `20261022030000`：解除認領時清理該身分攝影偏好，與攝影寫入使用相同 advisory lock，取得鎖後再驗權限。
- 加入路徑 `/iceland/join?token=…`。OAuth callback next 加上 sessionStorage 的精確本站加入路徑備援；不把邀請導向一般航班頁。既有成員重開有效連結直接回私人頁；已認領按鈕停用，提交前有確認。
- 私人頁使用公開空殼等待權限；住宿、攝影點與姓名從授權 DB 載入。前端 seed 保留為後台 bootstrap 輸入，已從 main runtime 移除；倫敦參加者改讀私人文件，不在 bundle 硬編姓名。
- 共用 Memo 與活動留言分成不同區塊，Memo CAS 寫入；私人航班卡顯示搭乘身分。行前清單 45 項／必帶、衣服、盥洗、其他，保留原公開四項出發提醒（不列入私人打包分類）。攝影開關與手機／相機收藏接回既有個人 RPC。

## 一次性初始化與順序

1. 正式 public schema 備份：`/Users/unizalin/travelmate-backups/20261022-userflow/before-schema.sql`，不在 Git。
2. 先以 `supabase db push --linked` 套用新增 migration，保留原 schema 與其他資料。
3. `scripts/prepare-fixed-journey.ts` 由現有私人 seed 與 45 項模板產生受控 SQL；利用既有 SQL helper 加入倫敦資料，不改行程。產物位於 repo 外，權限 0600，無 token 或憑證。
4. 透過 CLI 既有臨時資料庫連線，以 postgres 呼叫 `tripbook_initialize_fixed`，不以其他人的登入帳號代建、不放寬 RLS。連線憑證只經記憶體傳遞，未寫檔。
5. 同一正式交易呼叫 initializer 兩次，回傳同一 UUID；查核固定旅程 count=1、owner=`unizalin@gmail.com`、ownerBoundToU=true、packingItems=45，COMMIT 成功。Initializer 用 advisory lock + singleton，重跑不覆寫已存旅程。
6. 後續 migration 於發布前套用；部署與邀請產生結果於下方補記。

## 實際驗證

- 最新 worktree 完整 `npm run qa:preview` 通過：181 Vitest／46 檔、32 公開建置、5 DB 契約、8 通知、type-check、主 build、分享 build、check:share 62 個來源模組。
- 本機實際 PostgreSQL fixture `tests/journey-service/invite-membership.sql` 全部通過、ROLLBACK：重跑初始化唯一性、U 綁定與 45 項、未加入 RLS 零資料、一般帳號無後台、舊認領 API 拒絕、有效 token 加入、身分／帳號唯一性、Memo 認領作者、撤銷後拒絕加入、解除後旅程與清單不可讀、個人攝影偏好清除。
- OAuth 測試包含 query next 保留 token，以及沒有 next 時用 sessionStorage 恢復；加入 UI 測試包含已認領停用、確認後才提交、無效連結錯誤、Google 登入提示。
- 主版所有 JS 額外掃描六人姓名、私人住宿與指定私人攝影敘述，零命中；公開分享檢查通過。`git diff --check` 通過。
- 本機瀏覽器公開航班頁已確認「旅伴登入」、公開航班方案與無建立入口。

## 尚待真人驗收

使用者須在實機由 LINE 點正式邀請連結，選擇用 Safari／Chrome 開啟，完成 Google 登入與身分確認，檢查是否自動進入私人旅程。本代理無法代替旅伴本人完成此流程；此項不列為已通過。實際六帳號跨裝置同步與真實裝置推播仍須另驗，不將通知單元測試寫成實機推播通過。

## Git 與發布

開發 worktree `/Users/unizalin/.codex/worktrees/travelmate-tripbook/travelMate`，分支 `codex/tripbook-continue-20261013`。精確提交本任務變更，不含 `.env.local`、私有 SQL 產物或其他代理新增的 keepalive 交接。入口 main 的原有未提交內容保持不動。

發布狀態：待補記提交、整合與外部部署結果。完整模型名稱與推理等級未提供。
