# LINE 助手：本機驗證與正式上線清單

## 帳號與已完成設定

- TravelMate：@181bkufr，官方加好友 https://lin.ee/xIV8f3m。
- 既有 Provider TravelMate 已依使用者確認連動，Messaging API 已在官方 UI 確認「使用中」。啟用後不可更改／解除 Provider 連動；未新增重複 Provider。
- 建置中歡迎訊息、僅首次加入傳送、狀態消息、網站簡介與連結已保存。既有品牌頭像已在後台確認顯示；檔案取自 public/logo.png，裁切／公開期間使用者也有操作，僅回報已確認結果，不宣稱所有點擊皆由代理完成。
- 六格選單草稿 20470883 已存名稱、版型、文字指令及網站動作；未發布。圖片檔已完成，但瀏覽器檔案選擇未成功完成，因此尚未套入後台草稿。
- 圖片：artifacts/line-official-20261023/travelmate-richmenu.png，2500×1686、215108 bytes；同目錄 SVG 可編輯。無私人資訊。

## 本機程式範圍

- `/api/line?action=webhook`：原始 bytes HMAC-SHA256 驗簽，單一使用者來源，事件 lease／完成紀錄抑制重複；處理中重送回 503，已完成重送回 200。
- 行程／天氣／準備等文字指令回覆公開安全說明及現有網站入口。今日行程會顯示冰島日期與旅行前後說明，**目前不是在聊天內列出逐項活動的同步摘要**。即時天氣與極光詳細資料在網站查看，不捏造查詢成功或過期預報。
- 官方 account-link：LINE 發 linkToken、網站 Google 登入及明確確認、單次 nonce、LINE 簽章成功事件後才綁定。挑戰 9 分鐘到期；不改 claims／邀請或新增旅伴。
- `/line/connect` 與會員「我的」入口：獨立設定 LINE 提醒／解除綁定；跨帳號／卸載不套用舊請求結果。正式開關關閉時拒絕啟用並如實顯示。
- LINE 綁定／挑戰／聯絡狀態／發送紀錄／worker lease 皆 backend-only，anon／authenticated 無直接存取。封鎖時間採事件時間，舊事件不能覆蓋新狀態；解除後再綁定不遺忘封鎖。
- 極光沿用 eligibleAuroraWindow、notificationNight、tripNightCity、TRIP_PUSH_EXPIRY。LINE 由獨立 worker 檢查，同一套規則、獨立紀錄，不依 Web Push 的 lastSentNight 決定是否已發。
- 每夜穩定 LINE retry key、最多三次嘗試，發送前 SQL 重驗會員／訂閱／binding generation。配額查詢失敗或不足停止，不自動升級方案。會員取消／移除後不會再取得新發送工作；已開始的外部請求無法撤回，不承諾網路逾時下絕對只收到一次。
- 期限 2026-11-07T12:00:00Z，旅行有效夜晚 10/30–11/6，預設不訂閱；未替真人開啟提醒。

## 實際驗證

- 完整 `npm run qa:preview` exit 0：296 Vitest／62檔、47公開隔離、5 DB契約、2會員SQL、3儲存SQL、28通知測試；type-check、build、build:share、check:share（65 modules）全通過。
- SQL 在隔離 PGlite 實跑：一般角色不可讀表／執行私有 helper；非會員拒絕、不同 LINE ID nonce 拒絕、nonce 重用／過期拒絕、封鎖事件排序、解除／重綁、重試 key 穩定、當晚成功去重、取消與移除資格後不能 claim。
- HTTP／客戶端測試：驗簽、驗證用空 events、重複與處理中事件、群組隔離、未登入／非會員／跨 origin、忽略 body userId、官方跳轉白名單、quota fail closed、409 只在 LINE 回 accepted request ID 才當成功。
- 會員元件／服務：失敗不誤報開啟、切帳號不採用舊結果、明確確認綁定、異常回應與非官方跳轉拒絕。
- 真實本機正式產物頁 `/line/connect` 顯示登入入口，已讀 UI 與截圖；未登入真人會員或實際操作 LINE 綁定。未驗 iOS／Android 手機與鎖屏實收。
- 既有測試有預期的 network-failure 訊息，建置有既有 Browserslist／chunk 警告；測試退出碼均為 0，未執行自動修改型 lint。

## 正式上線進度（2026-10-23，取代下方歷史狀態）

使用者已明確回覆「同意，完成這次 LINE 正式上線」，授權專用金鑰、Vercel 伺服器秘密設定、LINE 專用正式 DB、部署、webhook／極光排程及六格選單；不代旅伴訂閱、不群發、不升級付費。不需重問同一份上線授權。

- 專用 long-lived token 已發行，bot info 核對 @181bkufr；秘密暫存於本機受限目錄，未寫 Git／聊天。待 Vercel 正式秘密設定驗證後清空暫存內容。不得重新發行另一把取代現有 token。
- 已用官方 API 建立六格選單 `richmenu-c003a5dc3978a5b703b4c6a4ca120b16`，上傳 PNG 後以下載圖片 SHA256 驗一致；尚未設為 default。保留原後台草稿20470883，不刪除。
- 正式 Supabase 已套 `20261023040000_tripbook_line.sql`，migration list 對齊；db lint 無錯誤，僅兩個原函式既有警告。只新增 LINE 表／函式，未改原旅程／會員／Memo／Web Push 資料。
- 原生完整 DB dump 因 Docker daemon 未運作而失敗；只完成正式 public schema 的 types 結構快照，不是可還原的完整資料備份，不可宣稱備份成功。
- 乾淨發布工作區已將 e5dbf4d 單獨 cherry-pick 為 feaab0def85ed4f9f0a8af3d80a236e65f5eff19，尚未 push。再次完整 qa:preview exit0，數量與上方一致。未夾帶開發分支其他未發布功能。
- 新增 `20261023050000_line_aurora_cron.sql`，同名排程可重跑、執行時才取 Vault 秘密、到期後不再呼叫；尚未套正式，必須先完成 API 部署。既有 Web Push 排程保留。
- Vercel 網頁與 CLI 目前未登入，已開官方登入頁並請使用者登入既有 TravelMate 管理帳號。這是目前阻礙；不是缺正式部署授權。登入前保留原正式網站，不發布失效 webhook／選單。
- 未設定 Vercel LINE 變數、webhook／LINE 排程，未啟用 LINE 提醒，也未送測試／廣播。真人綁定與手機實收仍未驗。

## 已授權的正式操作順序

1. 在 @181bkufr 的 Developers Console 發行一個專用 Channel access token。這是建立可持續收發訊息的機密憑證；Channel secret 及 token 只存入 TravelMate Vercel 的伺服器環境變數 `LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN`，不進 `VITE_*`、Git、聊天或交接文件。
2. 核對乾淨發布工作區 `/Users/unizalin/.codex/worktrees/travelmate-design-integration-20261022/travelMate` 的最新 main／remote 與狀態，只整合本次 LINE commit，不能直接推目前開發分支整包或夾帶其他未發布功能。重新驗證最終整合產物。
3. 先核對正式 migration 清單與備份策略，再套 `20261023040000_tripbook_line.sql`；只新增 LINE 表／函式，保留既有旅程、會員、Memo、Web Push 資料。若同時有新 migration 佔用版本，先重新編號並更新測試及文件，不改寫已套用 migration。
4. 部署網站與 API，保留 `LINE_PUSH_ENABLED` 關閉。Webhook 指向 `https://travel-mate-nine-rho.vercel.app/api/line?action=webhook`，先 Verify，再啟用接收及重送。後台歡迎訊息沿用 OA 管理；關鍵字回覆交 webhook，避免後台預設回覆重複。
5. 另建單一排程 `travelmate-line-aurora-check`，時間 `*/15 0-2,16-23 * * *`，呼叫同站 `/api/line?action=check`。Authorization 執行時取既有 Vault cron secret，絕不把值寫 migration。既有 `travelmate-aurora-check` 保留。設計成同名可重跑但實際套用前須先檢查現有工作。
6. 正式 DB／webhook／排程驗證完成才將 `LINE_PUSH_ENABLED=true`；開關未開時 API 拒絕訂閱，不能只顯示已啟用卻沒有排程。未自動為任何旅伴訂閱。
7. 完成圖文選單背景上傳與發布。若瀏覽器上傳仍不可用，可在取得專用 token 後改由官方 API 建立並管理完整選單，保留既有後台草稿；不要混用兩種管理介面宣稱能編輯彼此選單。
8. 真人先對官方帳號發送指令，再完成本人 Google 登入、綁定、開關及解除驗收；此為本人觸發的功能回覆。主動測試訊息若需要，另明確指定收件人與內容，不廣播六人、不用手動假預報當成功案例。

## 尚未執行／後續界線

- 目前已完成項目以上方「正式上線進度」為準；Vercel 秘密設定、網站發布、webhook、LINE 排程及 default 選單仍待完成，不能宣稱正式服務已啟用。
- 沒有將機密／會員對應放入公開建置；公開 JS 隔離驗證通過。
- Provider 的自家隱私權政策／條款網址選填空白，沒有填入不實網址。綁定頁已有資料用途說明；要提供獨立政策頁時，須依實際維護者及保存政策確認內容，不能冒用 LINE 的政策當 TravelMate 自家政策。
- 尚未做每日主動摘要與每次編輯提醒，避免本趟旅行增加不必要推播；這兩項在架構提案中是後續擴充。
- 工作區：指定開發 worktree、codex/tripbook-continue-20261013；共用狀態仍更新固定入口。完整模型與推理等級未提供，單一代理。

## 官方依據

- https://developers.line.biz/en/docs/messaging-api/linking-accounts/
- https://developers.line.biz/en/docs/messaging-api/verify-webhook-signature/
- https://developers.line.biz/en/docs/messaging-api/receiving-messages/
- https://vercel.com/kb/guide/how-do-i-get-the-raw-body-of-a-serverless-function
