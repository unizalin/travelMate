# LINE 查詢卡片設計

使用者提供彩色標題、內容摘要與按鈕卡片作為方向，並明確選擇關閉 LINE 主動提醒，全部採 reply 查詢。沿用既有六格選單及帳號。

- 採 Flex bubble。今日行程列公開景點，完整旅程分日期點選，天氣卡呈現所標城市當日溫度／風雨及接下來三小時雲量。極光卡只說明有效資料與條件，不以單一雲量保證可見。行前準備直接列重點。
- 公開景點抽為 shared/iceland-stops.mjs，網站與 LINE 共用；卡片標示公開快照，不冒稱會員即時同步。無私人 Memo、住宿、姓名、旅程 UUID。
- 點選日期以 message action 再觸發查詢，所有互動只呼叫 message/reply；reply 失效不降級 push。天氣資料使用固定城市、固定上游、4 秒 timeout，失敗回資訊不足卡。
- LINE runtime 禁用 push，不受舊環境 true 影響；獨立 migration 停用 LINE cron，原 Web Push 不動。網站與 LINE 通知說明一併改成查詢模式；可保留舊綁定的解除入口。
- 驗證所有指令只用 reply、天氣欄位與單位／日期、卡片符合官方格式、公開隔離、全套既有 QA。用本機卡片預覽檢視排版，LINE 真機以本人點選驗收。官方 validate-only 不發送，不廣播測試。
