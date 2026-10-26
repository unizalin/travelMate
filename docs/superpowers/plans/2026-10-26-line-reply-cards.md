# LINE Reply Cards Implementation Plan

Goal: 以使用者指定的 Flex 卡片呈現查詢，停止 LINE 主動發送。
Architecture: 公開景點共用資料 → 純卡片 builder；天氣在固定上游邊界驗證；既有 webhook 驗簽及 event lease 保留。
Execution: 依專案偏好由單一代理在指定 worktree 執行，無額外模型。

- [x] 抽公開景點至 shared/iceland-stops.mjs 與 d.mts，網站沿用同一資料。
- [x] 新增 scripts/lib/line-cards.mjs 與 line-weather.mjs，接 line-api 的文字指令；日期 message action 及 flex altText。
- [x] runtime 關閉 push，check 回 sent0；migration20261026010000停LINE工作，網站文案／啟用入口同步停用。
- [x] tests/notifications 驗 reply-only、失敗不fallback、日期／天氣與隱私；元件驗無啟用按鈕、保留解除。跑 npm run qa:preview。
- [ ] 乾淨發布分支只整合本次提交，官方validate-only及正式API檢查；更新共用CONTEXT／development-status與交接。無真人綁定或廣播。
