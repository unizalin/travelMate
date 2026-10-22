# 極光推播正式環境交接

## 實作完成、上線啟用仍受阻

- 已建立 Vercel config/status/subscribe/unsubscribe/check Functions，重用本機 makePushHandler 與 checkSubscribers；沒有另寫天氣判定，維持今晚到期、每晚重新開啟、最多五部裝置與發送防重。
- 訂閱由 Supabase Auth 驗登入；subscribe 另以 tripbook_can_read 驗成員，journey 由 App 同一個 VITE_ICELAND_TRIP_ID 環境設定解析。status/unsubscribe 維持登入與 endpoint 歸屬驗證。
- migration 20261022070000_tripbook_push_storage.sql 已先在 PGlite PostgreSQL 執行角色拒權與租約互斥測試，2026-10-22 已套雲端、函式 lint 通過。新表僅 service_role 可存取，不修改既有資料格式。
- 全部讀寫與排程共用資料庫租約，避免快照覆寫與平行重複發送。Vercel JSON body 會轉成 Buffer stream 給原 handler；有專門回歸測試。
- 正式 sw.js 已有 push 顯示與 notificationclick 開啟 /iceland?section=itinerary，既有離線快取未改。

## 外部阻擋與設定清單

Vercel CLI whoami 實回 Logged out。依使用者要求停止金鑰與憑證操作；未產生正式 VAPID、未寫入任何正式 secret、未啟用排程。GitHub CLI 的既存 token 也無效；Git fetch 可正常完成，但不代表 CLI API 授權有效。Work 瀏覽器停用，因此尚未以建立者實際操作 subscribe→status→unsubscribe，亦未收到手機通知。本項不能標成正式推播已完成。

程式已隨 main 5938a55 部署，Vercel success；外部 config 確認 503 application/json，check 無 secret 與 subscribe 無登入均為 401。訂閱表與租約 RPC 匿名實測 401／42501。這證明 API／拒權已上線，未證明推播已啟用。

請登入 Vercel 或於 travel-mate 專案 Production 環境設定：

- SUPABASE_SERVICE_ROLE_KEY
- AURORA_VAPID_PUBLIC_KEY
- AURORA_VAPID_PRIVATE_KEY
- AURORA_APP_ORIGIN（正式站 HTTPS origin）
- AURORA_PUSH_CONTACT（有效 mailto: 或 HTTPS 聯絡 URI）
- CRON_SECRET
- 確認原有 VITE_SUPABASE_URL、VITE_SUPABASE_ANON_KEY、VITE_ICELAND_TRIP_ID 與 App 相同。

所有 secret 僅放 Vercel 環境；CLI 注入須使用 stdin，不寫程式、文件、commit、回覆或命令列參數。設定後須重新部署。

未設定時 config 刻意回 503 JSON，不能偽造 ready:true。設定完成才應為 200 {ready:true, publicKey, local:false}。

## 排程尚未選定／啟用

無登入權限，無法查本專案實際方案。官方說明 Hobby 每日一次不足需求，Pro 可達每分鐘；不能把官方價目規則當成本專案方案的查證。恢復權限後先核實方案，再採頻率足夠的 Vercel Cron，否則採 Supabase pg_cron＋pg_net。目標為冰島傍晚至凌晨每 10–15 分鐘，呼叫受 CRON_SECRET 保護的 GET 或 POST /api/aurora-notifications/check。使用 pg_net 時須限制排程／Vault／HTTP queue 可見權限，不能讓一般成員讀到 Authorization header。此輪沒有假裝啟用任何排程，也沒有未授權新增假排程。

參考：[Vercel Cron 限制](https://vercel.com/docs/cron-jobs/usage-and-pricing)、[Supabase Cron](https://supabase.com/docs/guides/cron/quickstart)。

## 手動端到端驗收

1. 建立者手機：iPhone Safari → 分享 → 加入主畫面 → 從主畫面圖示開啟 → 登入 → 選地區並按「開啟今晚提醒」允許通知。
2. 確認正式 status 為 enabled:true；驗證者將同一 CRON_SECRET、AURORA_TEST_USER_ID 透過安全環境注入本機程序，執行 `node scripts/aurora-push-test.mjs`。腳本不輸出 secret。此受保護測試只發給指定帳號的有效裝置，標明「推播測試」，不消耗正常今晚防重標記。
3. 手機確實收到並能點開 /iceland，才算推播端到端完成。最後關閉提醒並確認 status false。測試輸出 tested 或 config 正常均不能取代手機收到。

## 驗證

雲端 handler 測試涵蓋未登入 401、非成員 subscribe 403、他人 endpoint 403、過期 false、Vercel parsed JSON 訂閱／查詢／取消、受保護測試發送與未設定 JSON 503。既有本機 8 項通知測試保留，新總數 11。完整驗證及部署結果見同日 me-page-cleanup 交接。
