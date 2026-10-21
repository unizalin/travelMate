# travelMate 登入版行前清單整合交接（2026-10-21）

## 範圍與結果

- 工作區：`/Users/unizalin/.codex/worktrees/travelmate-tripbook/travelMate`；分支 `codex/tripbook-continue-20261013`；基底 HEAD `eb16f91`。保留先前全部未提交變更，未 commit、部署或清理。
- 登入版將原本裝置儲存的四項「出發前清單」納入 `PACKING_TEMPLATE` 的第一分類「出發前」。現為五類、預設 49 項，只在「行前清單」標題顯示一個全分類總計數；原本的必帶 11、衣服 8、盥洗 11、其他 15 項內容不變。
- 分類顯示與 `mergePackingItems` 固定依「出發前／必帶／衣服／盥洗／其他」排序，類內才依 `orderIndex` 排序；既有項目的 `orderIndex` 不必搬移。
- `TripPreparation.vue` 移除裝置版四項與巢狀清單，改以獨立「行前清單」卡呈現原有 Supabase 清單。冬季攝影裝備、每日照片備份與攝影清單維持裝置儲存。公開版的四項文字共用相同來源，但公開頁原本的四項卡及 45 項行李結構維持不變。

## 資料保全與上線順序

- 新增 `supabase/migrations/20261021010000_tripbook_packing_departure_category.sql`，只放寬 `tripbook_packing_items.category` 的 CHECK。它不更新或刪除既有項目與 `tripbook_packing_completions`；各帳號勾選仍按 `user_id` 獨立儲存。
- **線上 Supabase 尚未套用此 migration。上線前必須先套用此 migration，再發布使用 49 項範本的前端。** 目前只有 migration 檔與靜態契約測試，沒有宣稱線上或本機資料庫已套用。若前端先執行，新分類會被舊 CHECK 擋下；前端會嘗試讀取既有 45 項並顯示範本更新失敗提示，避免舊勾選因整頁離線回退而消失。
- 舊裝置本機四項靜態清單的勾選**不搬移**到 Supabase；新「出發前」四項起始為未勾選。舊 localStorage 字串保持原狀，這次沒有清除。

## 修改檔案

- `src/domain/packingChecklist.ts`：新增四項及固定分類順序。
- `src/components/preparation/PreparationChecklist.vue`：改名「行前清單」、五分類；種入失敗時仍載入既有伺服器項目。
- `src/components/trip/TripPreparation.vue`：一張獨立行前清單卡與新儲存說明；其餘三組清單維持原方式。
- `src/components/trip/PublicPreparation.vue`：四項文字引用同一來源，公開版行李仍只顯示原四類 45 項。
- 新 migration 與 domain、component、service、SQL 契約測試。

## 驗證

- `npm run test:all`、`npm run type-check`、`npm run build`、`npm run build:share`、`npm run check:share`、`git diff --check`：通過。
- 針對性測試覆蓋 49 項種入、分類順序、公開版四項文字、登入版單一區塊與 49 項進度、舊資料庫拒絕新分類時仍可顯示既有項目。
- 目前瀏覽器操作功能停用，未完成登入後 390px 實頁視覺驗收；實際線上 migration、RLS 與跨帳號勾選同步也尚未驗證。完整模型版本與推理等級未提供。
