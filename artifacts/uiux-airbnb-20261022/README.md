# TravelMate UI/UX 原型 v1

設計來源：根目錄 DESIGN.md（design-md Airbnb 參考）。這是獨立原型，沒有接上正式 Auth、資料庫或儲存，不會更新已上線旅程。

## 預覽

在開發 worktree 執行：

```sh
python3 -m http.server 5177 --bind 127.0.0.1 --directory artifacts/uiux-airbnb-20261022
```

開啟 http://127.0.0.1:5177 。上方「預覽身分」可切換公開、旅伴、建立者。所有勾選、選班與筆記僅存在目前頁面的記憶體；重新整理即重設。

重新產生公開資料：

```sh
node_modules/.bin/vite-node scripts/prepare-uiux-prototype.ts
```

## 本輪已驗證

- 實際瀏覽器：390×844、1280×900；另驗 320px 窄螢幕，皆無文件水平溢出。
- 手機底部四入口、桌面頂部四入口與 768px/296px 主側欄；切尺寸後選中日期仍在可視範圍。
- 日期面板 10/28 切換與 ArrowRight 到 10/29，焦點跟隨選中日期。
- 45 項／四分類；勾選家裡鑰匙與外套後進度 2/45，分類維持展開。
- 選 FI0501，再改 BA802，該航段只有一個選擇。
- 旅伴模式管理入口零個，建立者模式一個；公開模式私人筆記工具零個。
- Memo 示意編輯、關閉與更新標示；公開登入入口開啟明示為原型的登入面板。
- 瀏覽器 error log 零筆。JS 語法檢查通過；靜態掃描無指定姓名、帳號、私人住宿、key 或 token，也無 fetch/storage 寫入。
- 既有 `npm run test:all`：181 Vitest、32 公開隔離、5 DB 契約、8 通知全通過。

## 圖片

- screenshots/mobile-itinerary.png：390×844 公開行程首屏。
- screenshots/mobile-checklist.png：390×844 四分類清單。
- screenshots/desktop-itinerary.png：1280×900 桌面行程與側欄。

正式 src、資料庫、邀請與已上線網站均未修改。未重跑主／分享建置，因本輪沒有改正式應用程式。原型審閱後再接入 Vue 與既有 RPC，屆時重新做完整功能、公開隔離與部署驗證。
