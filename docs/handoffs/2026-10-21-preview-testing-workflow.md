# travelMate 預覽與測試流程（2026-10-21）

## 使用位置

最新版程式在 `/Users/unizalin/.codex/worktrees/travelmate-tripbook/travelMate`，分支 `codex/tripbook-continue-20261013`。不要在 `/Users/unizalin/github/travelMate` 的 `main` 執行以下預覽並把它當成新版；兩處目前不是同一份程式。

## 一次完成程式驗證

```bash
cd /Users/unizalin/.codex/worktrees/travelmate-tripbook/travelMate
npm run qa:preview
```

這個指令依序執行 `test:all`、`type-check`、主程式 build、公開版 build、`check:share`。任一步失敗就停止，不會部署、提交或改動 Supabase。這是程式驗證，不能取代瀏覽器畫面與登入後資料驗收。

## 預覽建置後的 App

驗證成功後，在另一個終端機執行：

```bash
cd /Users/unizalin/.codex/worktrees/travelmate-tripbook/travelMate
npm run preview:qa
```

固定網址為 `http://127.0.0.1:5175/iceland?section=itinerary`。`--strictPort` 讓 5175 被占用時直接報錯，避免 Vite 自動換到 5176、瀏覽器仍看舊頁。此命令提供剛產生的 `dist`；修改程式後要重新執行 `npm run qa:preview`，再重開預覽服務或重新整理頁面。

在 390px 寬度至少檢查：倫敦 10/28、冰島 11/02、我的航班、行前準備；確認三個主分頁、兩段旅程與日期可切換，內容和選取狀態相符。記錄實際通過、失敗與尚未測試的項目。登入版 49 項清單、個人航班、留言與私人資料權限必須在連得上的 Supabase 與真實登入狀態下另測。

## 本機與線上環境界線

- 目前 worktree 的 `.env.local` 使用本機 `127.0.0.1:54321` Supabase。若本機 Supabase 未啟動，公開旅程仍可預覽，登入及個人資料功能不能因此視為通過。不要把正式憑證複製進交接文件。
- Vercel Production 目前對應 `main` 的 `6148d5c`，不是最新版 TripBook；Preview 對應 `codex/tripbook-continue-20261013` 的 `802c3e8`。兩個部署網址目前都會導向 Vercel 登入頁。部署成功紀錄只代表建置狀態；需用有權限的 Vercel 帳號進入後，才可驗收線上畫面。不要把部署保護關閉或把 bypass token 放進程式。
- 本流程不合併 `main`、不部署 App，也不修改資料庫。若要將新版送到正式版，需另行核對 `main` 上現有未提交變更與正式環境設定。

## 本次實測

- `npm run qa:preview` 全部通過；公開建置隔離檢查涵蓋 62 個來源模組。
- `preview:qa` 在 5175 啟動；`/iceland` HTTP 200。390px 實頁可顯示倫敦 10/28、冰島 11/02、航班與行前準備；主分頁、旅程與日期切換成功，文件寬度 390px，無水平溢出。
- 11/02 公開行程顯示 Seljalandsfoss、Skógafoss、Dyrhólaey、Reynisfjara、Black Crust Pizzeria。公開版不顯示私人住宿／攝影內容。
- 公開版「出發前清單」勾選後重載仍保留，測試勾選已還原；原先 2/4 狀態未改。這不代表登入版 49 項雲端同步已測。
- 本機 Supabase `127.0.0.1:54321` 無法連線；登入版清單／航班、留言、跨帳號權限未測。Vercel Production 與 Preview 均被部署保護導向登入頁，線上 UI 未測。
