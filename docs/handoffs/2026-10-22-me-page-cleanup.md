# 我的頁整理與整體驗證交接

## 完成項目

- 順序固定為身分→待辦→我的航班→旅費記帳→建立者邀請管理→帳號與裝置。四個主分頁、固定淺色與原冰島色票保留。
- 移除全部攝影偏好與收藏入口，移除主流程 photoPreferenceService／journeyPhotoContext 接線。舊元件／資料表保留，沒有 drop migration。活動拍攝建議固定公開、iPhone／相機內容與來源保留。
- 身分使用 selfMember／accountId 對應，私人頁首為「以（身分）瀏覽」。同步／離線 pill 收進身分卡，唯讀、未同步、本機錯誤等原狀態語意保留。
- section 統一白底邊框、14px 圓角與間距；身分卡保留輔助底。帳號與裝置列直接顯示 Google email、離線下載／同步時間、通知狀態／地區／到期；下載成功事件即時更新狀態。
- 記帳白底表單、欄位與按鈕對齊；分攤整格可點、44px 以上、選中描邊與勾號、窄畫面換行，選取全員／清除移到標題旁。金額原本就是空值＋placeholder 0，無需改驗證。欄位、幣別、平分、RPC、記帳資料未改。
- 公開隔離新增私人 My／device hook／後端模組與 server secret 識別字阻擋；攝影偏好舊模組仍防誤引入。公開攝影內容通過。

## 本次完整關卡

指定實作 worktree 單一代理，未啟動額外模型。npm run test（228）、test:public-build（42）、test:db-contract（5）、test:ledger-db（2 組 PostgreSQL）、test:notifications（11）、type-check、build、build:share、check:share（62 source modules）全部通過。雲端 migration 當天套用與 lint 通過。推播上線啟用仍受 Vercel 登入／環境／排程卡住，詳見 aurora-push-production。

部署狀態：準備以獨立提交進乾淨整合 worktree 合併 main，再 push。尚未寫成 Vercel success；完成後追加實際結果。Work 瀏覽器回報停用，因此未宣稱登入版視覺與手機驗收完成。

## 真人驗收待辦

- 手機收到受保護的測試推播、點通知開回行程；建立者 subscribe→status true→unsubscribe。
- iPhone Safari 加入主畫面待辦鏈、從圖示啟動與每晚重新開啟。
- 記帳雙帳號同步、新增支出／分攤／還款／修改與作廢。
- 390px 實機：區塊順序、帳號 email、裝置狀態、chip 換行及觸控。
