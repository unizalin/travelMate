# 2026-10-21 Muse 直接修改：公開頁內容串接（待 Codex 驗證）

使用者指示 Muse 直接修改、把三份預覽的內容串回同一頁。Muse 無 Mac shell，未跑任何測試／建置；以下變更已逐檔回讀確認寫入，待 Codex 跑 test:all、type-check、build、build:share、check:share 驗證。未提交、未部署。

## 變更（worktree，branch codex/tripbook-continue-20261013）

新增 3 檔：
- `src/data/publicDayExtras.ts`：公開日頁的導航詞與車程。導航詞以 icelandHandbook.preciseMapTerms（攝影書供應）為底，再以同型式（景點名＋Parking）補其餘公開站點；`publicNavTerm(name)` 以名稱包含比對（與 ItineraryActivities 的 mapTerm 同法）。車程以 suppliedDriveMinutes 為底（11/1 四段），另加攝影書 11/2 Seljalandsfoss→Skógafoss 25 分／25 km；其餘段落頁面顯示「車程待補／公里數待補」，不臆測。
- `src/data/dayOutfits.ts`：冰島 9 天各一句依日型態的穿搭（瀑布日、冰洞日、船日、市區＋Blue Lagoon 日等），出自攝影書逐日活動。
- `src/components/trip/PublicPreparation.vue`：公開版行前準備，比照 TripPreparation 的靜態內容：緊急資訊卡（112、App、租車救援待補、最近醫院、同行者電話待補）、已確認預約卡（BA802、11/4 冰洞與 11/5 Zodiac 票面時間未填標記、11/6 Blue Lagoon、11/7 BA801）、四組清單（出發前／裝備／每日照片備份／攝影清單 24 張，photoChecklist 與登入版共用來源）、官方連結與 ISK⇄TWD 即時匯率換算（同 TripPreparation 的 open.er-api.com 來源，開啟時自動讀取）。勾選存 localStorage `tripbook.prep:public`（裝置級、非帳號）。

修改 5 檔：
- `src/data/icelandPublic.ts`：公開站點補攝影書時間（11/2 Seljalandsfoss 08:35、Skógafoss 10:00、Reynisfjara 14:35)、備註（3 站）與提醒（Skógafoss 水霧、Reynisfjara 海浪安全）。其餘站點無書面時間者維持 null，不補造。
- `src/components/trip/TripReader.vue`：(1) publicActivities 映射補帶 item.notes 與 item.reminder;(2) 公開活動列傳入 :navigation-term（景點級導航）並填 #drive slot（車程行，樣式比照登入版 .drive-row);(3) DayConditions 的 after-weather 在公開版顯示「沿途實用」行（handbookDays 的 fuel 欄，公開安全資料）;(4) 公開行前準備改渲染 PublicPreparation（原迷你卡移除；.public-preparation-card CSS 已無用，可刪）。
- `src/components/trip/DayConditions.vue`：今日穿搭優先用 dayOutfitByDate[date]，無對應日期才退回 clothingAdvice（天氣規則）。
- `src/data/icelandFlights.ts`：IcelandFlight 加可選 reminder;BA802（線上報到 10/29 13:50 起、抵達後入境領行李取車驗車）與 BA801（11/7 07:50 退房→08:10 加油→08:25 還車→09:00 進航廈）填攝影書時間鏈。
- `src/components/trip/JourneyFlightCard.vue`：提醒改顯示 flight.reminder，無值才用原通用句。

## 請 Codex 重點驗證

- check:share:TripReader 現在 import icelandHandbook 與 PublicPreparation 進公開圖譜。icelandHandbook 為攝影書資料（無姓名／個人資料），理論上隔離仍成立；若 fixture 對模組數或 import 圖有斷言，可能需同步更新——請判斷是更新 fixture 還是改 import 路徑。
- 390px 實頁檢查：公開 11/1（車程四段＋導航詞）、11/2（時間三站＋提醒兩站＋車程一段）、行前準備五卡＋換算、我的航班 BA802/BA801 提醒。
- 登入版回歸：DayConditions 穿搭覆寫在登入版同樣生效（預期行為）；TripPreparation 未改動。

## 已知未補（資料待補，非本次遺漏）

多數站間車程分鐘與公里數、11/4 冰洞與 11/5 Zodiac 票面時間、租車救援與同行者電話、PNR 與行李額——皆依「不臆測」原則在頁面標待補。
