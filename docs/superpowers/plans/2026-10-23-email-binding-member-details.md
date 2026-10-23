# 信箱預綁與會員行程資訊實作計畫

依使用者已定案 spec，單一代理依序執行，一次部署。

1. 新增 20261023030000 migration：獨立 backend-only email reservations、管理設定／清除、本人比對／確認、管理狀態欄位；沿用 fixed journey row lock 與 claims 唯一限制。claims INSERT trigger 清除失效預綁，不改既有邀請 RPC。
2. 實跑 SQL 測試：權限、正規化、唯一性、已認領拒絕、本人限定、拒絕確認無寫入、競速／重複 claim、邀請預覽；前端服務解析與管理／確認元件測試。完成後套雲端 migration、核對 list 與 lint。
3. 會員入口與加入頁共用信箱確認元件，需本人按確認才寫入；舊邀請流程保留、拒絕候選後仍可使用邀請。
4. 會員 IcelandPlanner 明確傳遞文件活動的拍攝段，沿用 PhotographySpots，無資料不呈現；公開元件／資料不改，不加入個人偏好。
5. 住宿輔助列用住宿名建立既有格式的 Google Maps search 外連，不改住宿資料。
6. test:all、type-check、build、build:share、check:share、diff check；乾淨發布 worktree 只整合本次提交，重跑關卡，一次 push，核對 Vercel success。
7. 更新固定入口與開發 worktree 的 CONTEXT、status、逐部分 handoff，記錄 migration、驗證與發布 commit；真人流程與畫面交使用者實機驗收。

限制：不改旅程 JSON、既有 claims、有效邀請 token 或其他正式資料；不將私人信箱寫到公開來源／產物，文案使用「成員」。入口 main 和其他代理內容不動。
