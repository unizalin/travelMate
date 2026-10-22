# 2026-10-22 共同旅費記帳與分帳

## 已確認範圍

使用者要求在「我的」加入記帳，並選擇「共同記帳＋分帳」。入口為「我的→旅費記帳」展開區塊，維持原本四個主分頁與現有品牌色。

- 新增共同支出：日期、項目、GBP／ISK／TWD、金額、付款人與分攤對象。付款人預設自己已認領的身分；沒有可用身分時須手選。分攤對象逐筆選取，提供全選及清除。
- 分攤採選定人數平分，使用整數最小單位：ISK 整數、GBP／TWD 兩位小數；不可整除的餘數按身分 ID 順序分配，總和不變。畫面提供平分預覽與每人金額。
- 幣別分開統計總支出、未結清金額與建議還款，不推測匯率。
- 可登記實際已還款、修改自己建立的紀錄與確認作廢；登記只存紀錄，不執行金流。旅程建立者可協助修改及作廢任何紀錄。作廢保留資料但不納入分帳。
- 所有名單依該 journey 取得；資料庫檢查付款／分攤對象確為該旅程身分，可使用尚未認領的既有身分。一般登入或其他旅程成員無讀寫權。

## 後端與資料保留

- Additive migration `20261022060000_tripbook_shared_ledger.sql` 新增獨立 ledger 表與讀取／原子儲存／作廢 RPC。原 expense 表及其他行程文件、留言、選班、勾選未改寫。
- RLS 限同旅程成員讀取，瀏覽器無直接寫表權限；RPC 檢查成員、修改者、版本與合法金額／身分。解除認領後由現有 journey 權限函式立即拒絕下一次讀寫。
- 帳目 UUID 防止重送同一筆產生重複紀錄；修改有 revision 檢查，作廢與儲存於同旅程鎖內執行。
- Docker 無法啟動；改以 PostgreSQL WASM 引擎 PGlite 實跑 migration。測試載入正式 membership／admin helper，而非寬鬆模擬，驗證實際角色與 RLS。新增開發依賴與 `npm run test:ledger-db`，並納入 `test:all`。正式執行依賴不變。
- 本機 SQL／RLS 通過後，當天用現有 Supabase CLI 登入套用雲端；遠端 migration 紀錄與本機一致，`db lint --linked --schema public --level error` 無錯誤。未要求使用者提供金鑰，未寫入任何 token。

## 驗證結果

- `npm run test`：50 檔、221 項通過（新增 domain 5、service 3、元件 4）。
- 公開隔離 35 項、DB 契約 5 項、ledger PostgreSQL 1 組完整場景、通知 8 項，以及 type-check、build、build:share、check:share 全通過；公開 graph 仍為 63 模組。
- 本機 PostgreSQL：金額精確分攤、相同請求重試冪等、非法／重複／跨旅程身分拒絕、非作者拒絕修改、建立者可管理、舊版本拒絕、還款紀錄、解除認領立即拒讀寫、作廢不刪資料、匿名拒權均通過。
- 元件測試確認選定對象、雲端確認後才顯示成功、失敗保留表單、作廢先確認、切帳號丟棄舊回應、離線禁寫。公開建置新增 ledger 元件／服務／domain 與 RPC 字串隔離測試。
- 尚未在正式登入瀏覽器與手機實際新增帳目；Work 瀏覽器工具仍停用，未宣稱畫面與跨裝置人工驗收通過。部署後請在兩個成員帳號驗收新增支出、重新開啟、登記還款、修改與作廢。

## 工作區與交付

實作：`/Users/unizalin/.codex/worktrees/travelmate-tripbook/travelMate`，分支 `codex/tripbook-continue-20261013`；乾淨整合：`/Users/unizalin/.codex/worktrees/travelmate-design-integration-20261022/travelMate`，分支 `codex/tripbook-design-integration-20261022`。單一代理，完整模型／推理等級未提供。維持 main→Vercel。原未追蹤 keepalive 與主專案其他修改保留。設計與執行步驟在 `docs/plans/2026-10-22-shared-journey-ledger.md`。
