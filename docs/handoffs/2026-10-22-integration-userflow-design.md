# 2026-10-22 定版原型整合與邀請流程交接

本輪唯一規格來源為使用者於本聊天提供的十節定案；外觀來源為 `artifacts/uiux-airbnb-20261022` 最終原型。沒有以舊 spec 或舊交接覆蓋本次定案。

## 工作位置與版本

- 實作：`/Users/unizalin/.codex/worktrees/travelmate-tripbook/travelMate`
- 分支：`codex/tripbook-continue-20261013`
- 正式站： https://travel-mate-nine-rho.vercel.app
- 模型完整名稱／推理等級：環境未提供，無法核實。全程單一代理，未啟動額外審查模型。
- 主專案既有未提交變更與原有未追蹤 keepalive 交接檔案均保留，未搬動或納入本輪提交。
- 部署狀態：已合併 main 並部署成功，外部 bundle／公開隔離／Veður JSON 已驗證；登入版互動驗收因 Work 瀏覽器存取停用而待補。

## 定案對照：第六節

- [x] 行程：成員四個分頁、非成員只有行程；共同編輯、拖曳排序、提醒編輯、頁尾集中編輯、卡內收合留言與單層回覆保留。取消 Memo 編輯器及住宿卡，既有儲存欄位未刪除。倫敦參加名單只在私人元件。Plan B 收合；既有倫敦沒有 Plan B 時顯示待補，成員可以填寫，不推測內容。
- [x] 拍攝建議：公開 iPhone／相機兩列，沿用既有拍攝點與原有提示；公開模組不匯入私人偏好服務。顯示開關與手機／相機收藏集中在「我的→帳號」。
- [x] 沿途服務：既有每日加油城鎮、各站廁所、停車層級 Maps 導航均保留；成員與公開版共用同份服務資料。
- [x] 我的航班：逐航段選擇、替代班次並列、不預選，頁頂已選摘要；每張卡固定有抵達日期，已知跨日顯示 +1 日，未知顯示未確認；同行名單取自實際認領與選班資料；提醒有內容才收合顯示。
- [x] 行前準備：緊急資訊→預約→ISK 匯率→雲端行李清單；範本 45 項四分類（11／8／11／15），個人完成度與項目增刪改保留。未提供的醫院／租車救援與票券集合資訊維持待補／待核對。
- [x] 我的：單頁身分卡→有待辦才顯示→航班摘要→僅建立者邀請管理→帳號、攝影偏好與收藏、離線、通知提醒、登出本機。沒有舊設定分頁或密度選項。

## 定案對照：第七節

- [x] 倫敦＋冰島行程：沿用原有行程資料、時段、備註與各站提醒，不重排行程內容。
- [x] 天氣與穿搭：保留依日期／地區自動預報及九日專屬穿搭句。
- [x] Veður：有效警報在四態與兩地行程都位於提醒組最上方；既有 `/api/vedur-alerts` 部署設定保留，部署後已由外部確認 HTTP 200 與有效 JSON。
- [x] 官方連結、沿途服務與每日 Plan B：保留資料並套用定版呈現。
- [x] 公開隔離：公開建置允許拍攝建議與純資料，拒絕姓名／身分、留言服務、偏好、航班名單、私人 seed 與 Auth 模組；取消訪客航班與行前準備頁。
- [x] Google 登入、切換帳號及登出：一般登入不授予成員權限；登出使用 `scope: local`。邀請直接啟動 OAuth，不再額外開一層登入對話框。
- [x] 編輯、留言、選班與清單：沿用原 RPC／資料格式／CAS；留言自動刷新、單層回覆、個人選班與個人勾選皆保留。
- [x] 倫敦：保留完整行程、替代方案、私人參加名單與可編輯 Plan B；公開沒有參加者姓名。
- [x] 極光：保留概略定位、今晚卡、Web Push 訂閱；推播通知實機驗證待真人驗收。
- [x] PWA／離線：保留安裝與離線快取；已下載的私人行程在斷網時只限原登入帳號讀取，禁止離線編輯；恢復連線重新查後端權限。
- [x] 深連結：非成員指定 `flights`／`more`／`me` 會回到行程，不渲染私人頁面。
- [x] 資料保留：新 migration 不改寫既有 journey JSON、留言、選班或勾選；資料庫權限仍依各列 journey 判斷。
- [x] 部署鏈：保留 GitHub main→Vercel 與現有站台設定；沒有調整 Vercel Protection。

## 後端與初始化

- 雲端已存在唯一一份 journey，未另建第二份；建立者帳號仍為指定帳號且已綁定 U。
- 六個身分的字串已由雲端唯讀查詢核對：U、jinyo、Kevin Ho か、Rosanne 🌹、YU、思辰。雲端共用範本確為 45 項，沒有「出發前」分類。
- 新 migration `20261022050000_tripbook_journey_scoped_invites.sql` 已先在本機測試，再於同日套用雲端並寫入 migration 紀錄。
- 邀請管理 RPC 明確接收 `p_trip_id`；加入依 token 的資料庫雜湊查出該 journey，再於同一 journey 鎖內重新驗證。舊無 journey 參數的管理 API 已撤銷瀏覽器執行權限。
- 一份 journey 同時一條有效邀請，產生新連結使舊連結失效。資料庫雙向唯一約束保留；解除綁定回收權限並釋出身分、清除該身分私人偏好。
- 管理者依 journey owner 判斷，與認領查詢分開；建立者本人的 U 綁定有保護，不提供自我移除按鈕。
- token 僅經 RPC 回傳至畫面，不寫檔、不寫入 git。本文不包含有效邀請連結；重新開啟管理頁不回顯舊 token，需要複製時產生新連結。

## 實際驗證

- `npm run test`：47 個測試檔、187 項通過。
- `npm run test:public-build`：31 項通過。
- `npm run test:db-contract`：5 項通過。
- `npm run test:notifications`：8 項通過。
- `npm run type-check`、`npm run build`、`npm run build:share`、`npm run check:share`：全部通過。公開模組圖為 63 個來源模組。
- 本機 PostgreSQL 實跑 `tests/journey-service/invite-membership.sql`，交易完整回滾：初始化冪等、U 綁定、雙向唯一性、非成員拒讀、管理拒權、撤銷後拒絕加入、移除後即失去權限與偏好清除均通過。
- 雲端 READ ONLY 交易實測：以非成員 JWT 身分讀不到 journey、packing、roster、comments、admin state；驗證成功後回滾。
- 雲端寫入式回歸測試最初被自動審查拒絕（全表 UPDATE／臨時表未開 RLS）。使用者後來自行按 Run and enable RLS，結果因回滾後臨時表不存在而失敗，不能記作完整通過。後續唯讀確認沒有遺留測試帳號或公開 fixture 表，旅程仍為一份。
- Supabase Auth Dashboard 已實際核對：Site URL `https://travel-mate-nine-rho.vercel.app`；Redirect URLs 有正式 `/auth/callback` 與正式網域 `/**`，涵蓋 `/iceland/join` 及 query 回程，無需修改。
- OAuth 測試：登入請求攜帶完整邀請 next、callback 有 next／只有 sessionStorage fallback 均通過；sessionStorage 不可用不阻擋 OAuth。實際本機 provider 往返未完成，因 worktree 指向未啟動的本機 Auth；沒有宣稱真人 OAuth 已通過。
- 390px 瀏覽器實測：訪客開啟 `?section=me` 後回到行程；無底部導覽、無橫向溢出、無私人姓名／留言／收藏／住宿。公開拍攝建議與站點 Maps 連結可展開／顯示。
- 沒有執行會自動改碼的 lint；未啟動額外模型審查。

## 舊頁面處理

`TripDetail`、`TripOverview`、`DayDetail`、`TripMapOverview`、`JoinTrip` 的已掛路由皆改導 `/iceland`，view 檔案未刪除，主流程未引用。`/profile` 導至 `/iceland?section=me`；未掛路由的舊 view 沒有另行修改。保留的 `SharedActivityMemo` 檔案不再由行程引用；舊 memos 資料欄位仍保留，沒有重加 Memo 功能。

## 真人驗收與下一步

- [ ] LINE 點有效邀請→以 Safari／Chrome 開啟→Google 登入→身分確認→完成認領，使用另一個未加入帳號驗收；不要以建立者代認領其他身分。
- [ ] iPhone PWA 實際安裝、訂閱推播與收到今晚通知。
- [ ] 真機離線後重開已下載行程、恢復連線重新確認權限。
- [ ] 390px 真機四個分頁、展開留言與拍攝建議、選班、個人勾選。
- [ ] 依實際票券補冰洞、Zodiac、Sky Lagoon、11/7 Blue Lagoon 集合／報到資訊；醫院與租車救援資料待補，未編造。

## 正式部署與外部驗證結果

- 實作提交：`f92aa8a490c59144e87251874fc4225384dde1b4`。
- 乾淨整合 worktree：`/Users/unizalin/.codex/worktrees/travelmate-design-integration-20261022/travelMate`；分支 `codex/tripbook-design-integration-20261022`。
- main 初次整合提交：`bbddd0300cc222b556a09ffd629a005f008974b2`，已由正常 push 更新 main；GitHub 的 Vercel 狀態為 success，既有部署鏈與 Protection 設定沒有變動。
- 整合工作區重新執行全部指定關卡通過。依賴使用獨立副本；曾被公開模組圖拒絕的跨工作區依賴連結已移出，沒有放寬隔離檢查。
- 外部無登入請求確認正式站為新版本：HTML 為 light；實際引用的 `IcelandJourney`、`TripReader`、`IcelandPlanner` 與 `journeyInviteService` 模組具備本輪功能。公開 reader 模組沒有私人姓名、留言 RPC 或偏好 RPC；planner 沒有共用 Memo 編輯器。
- 外部 `/api/vedur-alerts`：HTTP 200、有效 JSON。上游回應 MIME 為 `application/x-javascript;charset=UTF-8`，不是 HTML 或登入頁；前端 JSON 解析可用。
- 本次沒有產生正式有效邀請連結，沒有把任何有效 token 寫入檔案或提交。
- 正式站既有建立者登入狀態曾確認可用，但部署後操作工具回報 `Local browser use is disabled in Work settings`，因此尚未完成新版登入四分頁、管理產生／複製連結、實際 Google 回程與新帳號認領。已向使用者請求重新啟用瀏覽器，沒有改用其他帳號、讀取私有登入儲存或繞過限制。
- 下一步：重新啟用 Work 瀏覽器存取後，驗收建立者「我的→邀請管理」並產生連結，只在聊天回覆提供；再由真人完成 LINE／PWA 推播／離線／390px 實機驗收。
- 本次交接補提交同時把最近醫院欄位明示為「待補」，保留原有地圖搜尋，沒有編造醫院資料。

## 最後修正與部署確認

- 醫院待補文案與斷言提交 `eef6de3`；乾淨整合後的程式版本 `0f3393f74f5f85db2d7c54609942f6ab8c9fe141` 已 push main，Vercel 狀態 success。
- 最後整合版本重新通過全部指定關卡：187／31／5／8 項測試、type-check、build、build:share、check:share（63 source modules）。
- 外部讀取新入口 `/assets/index-l8rkRf8S.js` 及其實際依賴，確認最近醫院待補、我的帳號內容、journey 管理 API、公開拍攝建議與隔離均存在且正確；警報 HTTP 200 有效 JSON。
- 使用者告知已重新啟用後再次嘗試瀏覽器，工具仍回報 Work 存取停用，因此登入四分頁與邀請連結產生仍未驗收；已再次請使用者切換設定，沒有繞過限制。
- 本次仍未產生有效邀請連結；本交接及所有提交均不含邀請 token 或金鑰。上述第六、七節勾選代表實作與所列驗證，不能替代尚待真人完成的操作驗收。
