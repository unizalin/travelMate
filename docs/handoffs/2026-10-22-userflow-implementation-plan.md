# User flow 實作計畫

目標：固定旅程、建立者 U、token 邀請認領、管理後台，保留公開資料隔離。
依使用者已核准規格單一代理直接執行，不另派審查模型。

- [ ] DB：新增固定旅程設定、邀請雜湊、認領時間；以 RPC 原子鎖定 token、身分與權限；所有管理操作驗證固定 owner；關閉舊建立／直接授權／繞過邀請認領入口。加入 SQL transaction fixture，驗證未加入、重複、撤銷、解除、管理越權與重跑初始化。
- [ ] OAuth：新增 `/iceland/join`，callback next 保留 token，sessionStorage 備援；只接受本站安全路徑。加入 callback 與 join 元件測試。
- [ ] UI：獨立 join、admin 與共用 Memo 元件；名單已認領停用、確認後提交；管理 UI 透過後端確認角色；名單／航班只在私人版顯示。
- [ ] 清單：恢復 45 項四分類，初始化只種這 45 項；保留舊資料，不清除他人清單。
- [ ] 完整 qa:preview、實際 SQL/RLS fixture、本機互動；受控套用雲端 migration、冪等初始化並驗證 owner/U。
- [ ] 精確 commit 檔案（不含 env/token/既有他人交接），乾淨整合 worktree 合併 main、push、確認 Vercel 與外部公開站；產生邀請 token 僅回報對話。
- [ ] 同步主目錄／worktree 最終交接與 CONTEXT／development-status，記錄未能代替的 LINE 真人驗收。
