# 原型追加三項調整（2026-10-22）

基準073cdd9，工作區travelmate-tripbook/travelMate，分支codex/tripbook-continue-20261013。只改artifacts/uiux-airbnb-20261022，無正式程式／登入／儲存／後端／部署變更。

1. 我的僅成員／管理者可達，單頁依序身分、我的待辦、航班摘要、管理入口（僅管理者）、帳號。既有原型沒有儀表板／資安／外觀／資料管理四分頁；本次確保沒有加入它們。攝影偏好、離線、通知入口縮成帳號段內文字操作，避免遺失上一輪入口。待辦只列未完成行李與待核對票券；目前原型票券均待核對，因此仍有待辦。沒有獨立同步卡。
2. 導覽由角色過濾，訪客3、未加入3、成員4、管理者4；changeView與render也防止未加入者進我的。一般模擬登入仍只到未加入。未加入頁首details帳號小選單提供示意Google帳號、切換示意帳號、登出本機；不進我的。角色預覽工具獨立在頁首，與產品權限入口分開。
3. 套用使用者指定正式色票：背景F7F8F6、文字263331、主色397D86、輔助底E5EBDF、提醒C76B46、深色區塊233E49。移除珊瑚紅與圖釘logo。正式TripReader.vue固定iceland色票，沒有prefers-color-scheme或.dark覆寫；因此系統深色也沿用正式版固定淺色，不自行發明深色主題。這取代073cdd9自行建立的深灰深色樣式。QA fixtures已重新產生。

## 已驗證

- node --check app.js、git diff --check通過。
- VM實際執行navMarkup/meView/roleStatus：四態tab數3/3/4/4；未加入meView空；管理按鈕僅admin；未加入頁首含帳號選單、切換及登出。
- npm run test:all：181 Vitest＋32公開建置＋5DB契約＋8通知全過。這不代表新原型瀏覽器驗收通過。
- 其餘提醒、雙時鐘、日期列、極光、航班／Memo／留言／攝影、45項四分類與進度邏輯保留。

## 尚未驗證（必須補做）

瀏覽器工具回覆「Local browser use is disabled in Work settings」。因此不能重跑iPhoneSE375×667／iPhone14390×844四入口淺深色16組，也未實點頁首切帳號／登出。上一輪revision-qa.json與screenshots/revision僅代表073cdd9，不適用本次新畫面。靜態VM確認導覽生成數，未確認實際渲染尺寸、44px、捲底遮擋。需使用者開啟Work瀏覽器操作後接續；不應跳過此驗收宣稱全部完成。
