# TravelMate LINE 助手實作計畫

目標：為已建立的 @181bkufr 提供公開安全查詢、既有會員的官方帳號連結及獨立極光訂閱；正式發送前完成可審閱的本機實作與驗證。

架構：單一 Vercel `/api/line` 端點按 action 分流，保留 raw body 驗簽；Supabase backend-only 資料管理綁定、短效挑戰及發送去重。沿用既有 Google 登入／固定旅程 membership、極光條件與日期，不改現有 Web Push 訂閱。依專案覆寫採單一代理，指定 worktree 實作，不搬動其他修改。

## 約束

- LINE 無私人 Memo、住宿、旅伴身分或旅程 UUID。查詢只回公開資訊與不含私人識別碼的網站入口。
- 加好友不等於會員，不自動訂閱；帳號連結成功後仍預設通知關閉。
- 簽章驗原始 bytes，拒絕無簽章／無效簽章；群組不執行私人操作。
- 綁定用 LINE linkToken + 隨機 nonce；短效單次使用、綁定 LINE user ID 必須與挑戰相符；不能依名稱或 email 推斷身分。
- 設定 API 需網站 JWT 與會員資格；發送前重新驗資格。解除綁定／封鎖立即停用後續通知。
- 每位會員每夜獨立去重，與 Web Push 成功紀錄無關；未有安全的正式秘密設定及真人驗收前不試發／部署。

## 1. 帳號與素材

- [x] 建立帳號、歡迎文案、狀態／網站入口；確認重載保存。
- [x] 圖文選單存六格草稿，未發布。
- [x] 依使用者明確確認啟用 Messaging API，狀態使用中。
- [ ] 製作選單背景與頭像，將每格行為與實際端點對齊後才發布。

## 2. 後端介面與儲存

檔案：scripts/lib/line-security.mjs、scripts/lib/line-api.mjs、scripts/lib/line-runtime.mjs、api/line.mjs、supabase/migrations/20261023040000_tripbook_line.sql。

介面：`verifySignature(raw,signature,secret):boolean`；`makeLineHandler({store,line,authorize,origin,now}):(req,res)=>Promise<void>`；`store` 僅由 service_role adapter 使用，SQL 交易涵蓋 nonce 消耗與唯一綁定，前端不可直接修改資料表。

- [x] 簽章測試驗原始 bytes、變更內容、malformed 簽章與缺少 secret fail closed。
- [x] 隔離 PostgreSQL 測一般角色無存取權、nonce 跨 LINE 身分／到期／重用、綁定與取消及會員資格重驗。
- [x] HTTP 測未登入、非會員、跨 origin、空 events 驗證及驗簽失敗無副作用。
- [x] 重送／處理中事件與官方跳轉、LINE retry key／配額錯誤、解除綁定完成本機測試；真實 LINE timeout／reply 實收仍待正式驗收。

## 3. 會員介面

檔案：src/components/trip/LineReminderSettings.vue、src/services/lineReminderService.ts；會員頁接入 JourneyMyPage.vue。短效綁定入口保留既有登入返回路徑，不擴張任意 redirect。

- [x] 「我的」接獨立 /line/connect 入口，綁定連結需明確確認，狀態與通知開關在該頁管理。
- [x] 帳號切換及卸載撤銷舊請求呈現，不將前一帳號狀態寫給新帳號。
- [x] 測設定失敗不誤報成功，未登入／未加入不可綁定，解除後通知狀態關閉。

## 4. 極光發送及正式設定

- [x] 沿用 eligibleAuroraWindow、notificationNight、tripNightCity 及 TRIP_PUSH_EXPIRY；LINE 去重／取消狀態獨立。
- [x] 交易 lease 防多工作者；穩定 retry key 與當晚投遞紀錄；配額不足停止、不升級付費。
- [x] 本機 qa:preview 全通過；SQL 權限實跑，未跑真人／正式流程如實記錄。
- [ ] 正式 secrets／migration／webhook／排程變更整理為具體 rollout；依既有授權邊界處理。真人試發明確指定收件人與內容後才送，API 200 不等同手機收到。

## 接續狀態

帳號門面、API 啟用及本機串接完成；本機完整驗證通過，查詢目前導向網站而非聊天內同步活動摘要。選單素材完成但未套入草稿，正式 DB／網站／排程、機密及發訊尚未操作。正式上線清單見 docs/handoffs/2026-10-23-line-rollout.md；固定入口同步更新狀態。
