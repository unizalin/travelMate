# TravelMate 共用記憶入口

本 worktree 的共用開發規則與最新決策請先讀：

- `/Users/unizalin/github/travelMate/AGENTS.md`
- `/Users/unizalin/github/travelMate/CONTEXT.md`
- `/Users/unizalin/github/travelMate/docs/development-status.md`

更新共用記憶請寫到上述固定入口，避免這份指向文件與主紀錄各自累積不同決策。此文件不代表已把新版合併到 main。


## pstack 專案限定設定（2026-10-19）

- pstack 0.9.93 已以 skills-only 方式安裝於本工作區 `.agents/skills/`，來源 commit `3cff27a2dda8ab0390e3db55f4190539c5b86759`。只在使用者要求 pstack／poteto-mode 時使用；一般聊天與小修不自動啟動完整流程。
- 使用前讀 `.agents/skills/poteto-mode/SKILL.md` 與 `references/codex-tools.md`；本節為使用者既有偏好的專案覆寫，優先於技能預設。上游技能保持原文，未安裝全域外掛、hook、MCP 或全域 slash shortcuts。
- 預設單一代理完成工作，先重現問題、找根因、做最小修正、跑既有驗證。不得因技能預設而自動啟動 architect／arena／interrogate／thermos 等多代理或多模型流程；需要時先說明具體收益並取得使用者授權。
- 延續模型偏好：實作 `gpt-5.6-luna`／`medium`，小修 `low`；不得自動升級、改用 Claude 或外部模型。這是執行偏好，並不會切換目前聊天模型；無法核實目前完整模型與推理等級時，明確標示未提供。
- 正式資料庫、部署、公開分享與 PR 發布遵循既有專案授權邊界；安裝技能不構成這些操作的授權。公開版不得包含 Memo、私人住宿／攝影內容或私人旅程識別資訊。
- 程式修正只在 CONTEXT.md 指定的最新 worktree 執行；入口 main 的原有變更不搬動、不覆蓋。以共用文件更新接續資訊。
- 新版既有驗證：`npm run test:all`；依變更補 `npm run type-check`、`npm run build`。觸及公開 reader 或資料邊界時加 `npm run build:share`、`npm run check:share`。SQL/RLS 與登入後跨帳號流程須有實際驗證，未跑不可宣稱通過。`npm run lint` 帶自動修改，不作無差別檢查使用。
