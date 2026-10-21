# TripBook continuation

本次銜接工作區為 `/Users/unizalin/.codex/worktrees/travelmate-tripbook/travelMate`，目前分支為 `codex/tripbook-continue-20261013`，基於 `1fe254da31ba14c7c026c5fd3ff1afd21ade4bd1`。原始 `/Users/unizalin/github/travelMate` 的未提交變更保留於原位置，未被本工作區修改；本工作區的變更尚未提交。

## 驗證指令

```sh
npm ci
npm run build:share
npm run check:share
npm run test:public-build
npm test
npm run test:all
```

`build:share` 會輸出 `dist-share/.vite/manifest.json` 與 `dist-share/public-module-graph.json`。`check:share` 需要實際存在的 artifact，會檢查 Vite manifest 及 Rollup source module graph，拒絕 private planner/seed、Supabase/auth client 與路徑 traversal。`test:public-build` 使用 fixture 覆蓋安全 artifact、private module、缺少 artifact 與 traversal。

公開建置由 `share.html` / `src/share.ts` 進入，只載入公開行程資料與 reader；一般 app 建置仍由 `src/main.ts` 進入，保留登入、planner、Supabase 與 private journey seed。公開建置檢查不依賴 minified symbol 掃描，而是讀取 manifest 與明確的 source module graph。

本次沒有部署、沒有修改正式 Supabase 或正式 Site，也沒有加入新依賴。後續仍需處理 PWA 離線 queue/sync、帳號認領與邀請流程，並在取得正式環境存取權後另行準備 production rollout。

目前可用本機預覽 `http://localhost:5174/share/iceland`（由 root integration 工作區啟動）；沿用已確認的本機 Supabase 環境。這些驗證不代表正式資料庫的 schema、RLS 或健康狀態已驗證。
