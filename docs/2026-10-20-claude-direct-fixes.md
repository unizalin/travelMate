# 2026-10-20 Muse 直接修正（待 Codex 驗證）

使用者指示改由 Muse 直接修改本地檔案，Codex 只負責跑驗證。本輪 Muse 以檔案工具逐段修改 worktree 原始碼，未在本機跑測試（Muse 側無 shell）。修改範圍僅呈現與事件接線，未動留言 RPC、CAS 存取流程、SQL/RLS、正式資料與部署。

## 修改內容

1. `src/components/trip/JourneyClocks.vue`
   - 新增 `combined` prop。TripReader 原本就傳 `:combined="!!slots.prelude"`，但元件未宣告此 prop（落入 fallthrough attr），`region` 永遠是預設 iceland，登入合併畫面只顯示冰島＋台灣時間。
   - combined=true 時顯示「倫敦 HH:MM · 冰島 HH:MM · 台灣 HH:MM」；非 combined 行為不變。

2. `src/views/IcelandPlanner.vue`
   - 接上倫敦 Plan B 編輯：LondonPrelude 會 emit `edit-plan`（date、field、value），先前 IcelandPlanner 沒有監聽，編輯模式下改倫敦「保住／先刪」會靜默遺失。新增 `editLondonPlan(date, field, value)`（語義比照既有 `editPlan`，含 handbookDays fallback），並在 LondonPrelude 標籤加 `@edit-plan="editLondonPlan"`。
   - 移除失效的「加入倫敦」接線：`importLondon()` 函式（綁在 LondonPrelude 從未 emit 的 `import` 事件上，永遠不會觸發）、LondonPrelude 標籤上未宣告的 `:can-save`、`:dirty` props 與 `@save` listener 一併移除。`isOnlyLondonAddition` 的載入衝突邏輯與 `londonJourneyService` 未動。

## 請 Codex 驗證

- `npm run test:all`、`npm run type-check`、主／分享 build、`npm run check:share`、`git diff --check`。
- 重點回歸：(a) 登入版標題下時鐘顯示倫敦・冰島・台灣三地；(b) 編輯模式下修改任一倫敦日的保住／先刪，內容進 draft 且可隨雲端儲存保存；(c) 確認沒有測試或程式碼還引用已移除的 `importLondon`。
- 若驗證失敗，依錯誤修正並在本檔案或 CONTEXT 註明；不要還原上述三項修改的意圖。
