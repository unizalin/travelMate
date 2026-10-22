# 極光整趟提醒收尾計畫

目標：整趟訂閱、共用裝置提示、旅行地圖連結及 Vault 排程，一次發布。
架構：保留既有通知來源與門檻；新增向後相容 scope，舊今晚紀錄自然過期。新訂閱以固定公開城市對照日期，不匯入私人住宿資料；裝置狀態只由 useDeviceReminders 提供。

- [x] 1. 在 shared/aurora-trip.mjs 定義八晚城市與截止時間。先加通知測試確認期間、跨晚去重、城市、取消與舊紀錄，再改 scripts/lib/aurora-push.mjs 與 scripts/aurora-push-server.mjs。新增 scope migration，舊列預設 tonight。
- [x] 2. useDeviceReminders 由 IcelandPlanner 提供、設定與我的頁共用，明確 ready；新增成員提示元件，確認待辦、三態、稍後與成功消失，主按鈕沿用 aurora query 開詳情。
- [x] 3. TripReader／IcelandPlanner 沿途實用及 TripPreparation 資訊區加入同一外連；不加 checklist 或 iframe。
- [x] 4. 用使用者既有 secret 寫入 Vault travelmate_aurora_cron_secret；migration 啟用 pg_cron/pg_net、同名 unschedule/schedule，POST 端點，*/15 0-2,16-23 * * *。驗證手動同內容與 tick 回應，任何401停止。
- [ ] 5. 執行 test:all、type-check、build、build:share、check:share、diff check；乾淨整合僅本次四部分、一次 push main，核對 Vercel success；雙處記憶與逐部分交接。

不修改會員資料、RLS、既有環境變數、secret 或 check 端點契約。真機 popup／訂閱／實收保留使用者驗收。單一代理直接執行，不另外啟動模型。
