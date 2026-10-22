# 2026-10-22 Airbnb 方向 UI/UX 原型

使用者要求以 design-md 開始整體 UI/UX 整理；延續先做可操作原型、確認後再套正式元件的順序。

## 本輪交付

- 根目錄 DESIGN.md：Airbnb 白底、#ff385c、#222222、字級／留白／形狀與可及性規範。
- docs/superpowers/specs/2026-10-22-travelmate-airbnb-uiux-design.md：範圍與方案取捨。
- docs/superpowers/plans/2026-10-22-travelmate-uiux-prototype.md：已完成計畫。
- artifacts/uiux-airbnb-20261022：獨立靜態原型與手機／桌面實拍截圖。四入口為行程、我的航班、行前清單、我的；管理、離線與通知移到我的。
- scripts/prepare-uiux-prototype.ts：只從既有公開行程、公共航班與 45 項清單產生資料；不匯入私人 seed。

本機預覽 http://127.0.0.1:5177 ，Python server 綁定 127.0.0.1。預覽分公開／旅伴／建立者示意，無真實姓名、帳號、私人住宿／攝影／Memo／邀請資料；無 API 或瀏覽器儲存寫入。已將可操作預覽頁保留在使用者旁的瀏覽器。

## 實際驗證

390×844 與 1280×900 視覺／互動，另驗 320px：無水平溢出；手機底部與桌面頂部導覽不重複。日期面板與鍵盤 10/28→10/29 正確、焦點跟隨；縮放後所選日期仍可見。四分類勾選進度 2/45；同航段 FI0501 改 BA802 只保留後者；成員無管理入口而建立者有；公開無私人操作；Memo 僅原型回顯；登入按鈕開啟清楚標示的示意面板。error log 零筆。Reduced-motion 規則已加入，未宣稱完整無障礙人工稽核。

`node --check` 通過，產生資料確認 15 天／8 航班／45 項。指定私人字串掃描零命中，無 fetch/storage 寫入。既有 test:all：181 Vitest、32 公開建置、5 DB 契約、8 通知通過；正式 src 未改，未重跑雙 build。

## 後續

先由使用者審閱原型的四入口、日期列、閱讀密度與珊瑚紅方向。接入正式頁面時才調整 TripReader／IcelandJourney／IcelandPlanner 的結構，保留既有成員／管理者 DB 權限、OAuth token 回跳、Memo CAS 與個人偏好隔離。既有 section=more 要保留相容；新我的入口才放管理。不得把原型的角色下拉與記憶體狀態帶成正式權限模型。

工作區 /Users/unizalin/.codex/worktrees/travelmate-tripbook/travelMate；分支 codex/tripbook-continue-20261013，起始 HEAD 1a95a01。本輪僅本機原型與文件，沒有合併 main、推送或部署。入口 main 原有未提交內容與其他代理 keepalive 交接保持原樣。完整模型名稱與推理等級未提供。
