# 原型：公開拍攝建議與沿途服務（2026-10-22）

工作區travelmate-tripbook/travelMate，分支codex/tripbook-continue-20261013；基準d6f31b7。只改原型及其資料產生器，未改正式程式、DB、權限、邀請或部署。

- 非成員（訪客／未加入）只留行程一頁，navMarkup、changeView與render均限制；成員／建立者仍四入口。頁首一般登入只到未加入。
- 四態公開各站拍攝建議，details直接卡片內展開iPhone／相機兩列，沒有sheet或私人內容占位字。資料從icelandPhotography的icelandPhotoSpots及cameraSettingsByPhotoSpotId精確名稱映射；未引入私人旅程seed、photoTip私人筆記、Memo或住宿。單一裝置沒有資料時沿用正式PhotographySpots.vue的既有fallback文案，沒有自行寫拍攝內容；完全無spot的站點不顯示。成員個人顯示開關與本次預覽收藏保留在我的，訪客不受成員偏好影響。
- generator使用publicDayServices與publicStopService，日期服務放行程下方沿途實用，站點廁所放導航下方；連結沿用Google Maps query格式。沒有倫敦服務資料，不新增。

## 日期與站點

| 日期 | 每日服務（加油／額外廁所） | 導航下方站點廁所 |
| --- | --- | --- |
| 10/30 | Costco Garðabær；KEF機場 | — |
| 10/31 | Borgarnes、Grundarfjörður | Arnarstapi、Kirkjufellsfoss（Grundarfjörður） |
| 11/1 | Laugarvatn | Þingvellir訪客中心、Strokkur（Geysir訪客中心）、Gullfoss訪客中心 |
| 11/2 | Vík | Seljalandsfoss停車場、Skógafoss停車場、Reynisfjara停車場 |
| 11/3 | Kirkjubæjarklaustur | Fjaðrárgljúfur停車場、Diamond Beach（Jökulsárlón停車場） |
| 11/4 | Höfn；Hali集合點、Jökulsárlón停車場 | — |
| 11/5 | Kirkjubæjarklaustur、Vík、Selfoss；Vík廁所 | — |
| 11/6 | Grindavík | Hallgrímskirkja周邊 |
| 11/7 | Keflavík還車前；KEF機場 | Blue Lagoon |

## 驗證與限制

- 資料產生器成功：15天、8航班、45清單。node --check與git diff --check通過。
- VM實際執行四態itineraryView：Seljalandsfoss原文、iPhone／相機列與inline details都存在，無舊占位字；非成員1入口／成員4入口。倫敦無photo或服務區；成員隱藏後其自身不顯示，切public仍顯示。
- npm run test:all全過：181 Vitest＋32公開建置＋5 DB契約＋8通知。既有測試不等於新版原型瀏覽器驗收。
- 瀏覽器工具仍回覆Local browser use is disabled in Work settings。沒有四態展開截圖，沒有實點或視覺尺寸結果，不拿舊截圖充數。需恢復Work瀏覽器操作再補四態各一張拍攝建議展開圖，以及前輪16組驗收。
- 使用者本輪明確授權公開原型的既有拍攝建議，取代原型先前攝影私有呈現；正式版公開隔離規則未更動。
