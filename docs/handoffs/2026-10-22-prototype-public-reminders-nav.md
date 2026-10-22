# 原型第10項：恢復公開極光／雙時鐘，隱藏非成員導覽（2026-10-22）

基準914b819；工作區travelmate-tripbook/travelMate，分支codex/tripbook-continue-20261013。只改原型app.js/styles.css及產生的QA CSS，未改正式程式、Auth、DB、部署。完整模型與推理等級未提供。

## 修正

1. reminders不再對非成員整組return空；僅attention-card（出發前先注意、全域通知、我的待辦）包joined判斷。
2. 四態冰島段都顯示今晚極光（未載入即時雲量/Kp、不判定）與冰島/台灣雙時鐘；倫敦段無極光，顯示倫敦/台灣雙時鐘。成員/建立者保留注意卡→極光→雙時鐘→日期順序。
3. 非成員mobile-nav hidden=true、innerHTML空；CSS [hidden] display:none!important，避免手機media display:grid覆蓋hidden。body.nonmember時page底部24px，取代預留導覽的110px。成員保持四格導覽與原留白。
4. 提醒橘線改鎖attention-card，避免非成員的極光卡因成為第一張而誤套提醒樣式。拍攝、服務、留言、定版色票與其他功能保留。

## 實際驗證

- VM執行實際render/reminders，四態×冰島11/2/倫敦10/28共8案例通過：注意卡僅成員、極光僅冰島、雙時鐘四態都有、順序正確；非成員nav hidden真且0按鈕，成員hidden假且4按鈕；nonmember class隨角色切換。
- hidden CSS優先級與24px底部規則靜態檢查通過；PostCSS parse、node --check、git diff --check通過。
- npm run test:all：181 Vitest（46檔）＋32公開建置＋5DB契約＋8通知全過。
- 瀏覽器工具仍回覆Local browser use is disabled in Work settings。hidden屬性與CSS依規則將不產生版面高度，但本輪未取得瀏覽器computed display/height數值，不能宣稱已實測高度0。
- iPhoneSE375×667及iPhone14390×844實際捲底、遮擋、留白與新版截圖均未驗證，需恢復Work瀏覽器操作後補做。VM模擬DOM不能代替這項驗收。

此交接取代第7–9項交接中「非成員沒有極光與時鐘」的錯誤範圍紀錄；其他歷史文件保留。
