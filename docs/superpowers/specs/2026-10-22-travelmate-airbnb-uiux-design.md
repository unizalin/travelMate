# TravelMate 四入口與行程閱讀設計

使用者已同意以 design-md Airbnb 參考重整手機 UX，並開始先做原型。完整規範以根目錄 DESIGN.md 為準。

已比較：只換色彩能減少差異但無法整理長頁；直接重排正式站會把視覺選擇與資料同步驗證混在一起；採可操作原型先確定四入口與資訊層級，可獨立審閱後接回原服務。這輪採第三種。

產物：DESIGN.md；artifacts/uiux-airbnb-20261022/index.html、styles.css、app.js、data.js；公開資料產生器 scripts/prepare-uiux-prototype.ts。原型分成公開／旅伴／建立者三種顯示模式，皆不連 Auth 或 DB；正式另保留「已登入未加入」與公開閱讀相同、顯示帳號的狀態。

內容來源限定 publicIcelandJourney、publicLondonJourney、londonItinerary、icelandFlights、PACKING_TEMPLATE 及既有公開 daily pace。不改動正式頁面、既有行程、權限或邀請。不使用來源不明或與冰島不符的照片。

驗收：390px 手機與寬版實際瀏覽；四入口與日期保持選擇、按鈕不被底部導覽遮擋、清單分類與 45 項計數、航班按群組選擇、公開模式無私人操作、鍵盤與 reduced motion、無私人資料字串。原型確認後才執行正式元件改動。
