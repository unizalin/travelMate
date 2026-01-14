# 🤖 Antigravity AI 使用指南

## 📖 概述

這個資料夾包含了幫助 Antigravity AI 快速理解和處理 TravelMate 專案的所有必要資訊。

---

## 📁 檔案說明

### 1. `context.md` ⭐⭐⭐ 最重要
**用途**：完整的專案上下文和技術架構

**包含內容**：
- 專案概要和當前版本
- 完整的技術棧說明
- 專案結構和檔案組織
- 安全性與性能特性
- 開發規範和最佳實踐
- 已知問題和限制
- 給 Antigravity 的具體提示

**何時閱讀**：
- ✅ 每次開始新任務時必讀
- ✅ 需要了解專案架構時
- ✅ 不確定如何處理問題時

---

### 2. `QUICK_START.md` ⭐⭐⭐ 最重要
**用途**：快速啟動指南和工作流程

**包含內容**：
- 如何讓 Antigravity 像 Kiro 一樣工作
- 根據不同任務類型的檔案清單
- Kiro 的完整分析流程
- 具體的工作範例
- 最佳實踐建議

**何時閱讀**：
- ✅ 第一次使用 Antigravity 時必讀
- ✅ 需要了解工作流程時
- ✅ 想要學習 Kiro 的分析方法時

---

### 3. `FILE_INDEX.md` ⭐⭐ 很重要
**用途**：檔案索引和快速查找指南

**包含內容**：
- 按功能分類的檔案清單
- 按技術層級分類的檔案清單
- 按問題類型分類的檔案清單
- 常見任務的檔案清單
- 關鍵檔案標記
- 檔案更新記錄

**何時閱讀**：
- ✅ 需要快速找到特定檔案時
- ✅ 不確定哪些檔案相關時
- ✅ 想要了解專案結構時

---

### 4. `README.md` ⭐ 重要
**用途**：本檔案，Antigravity 使用指南

---

## 🚀 快速開始（3 步驟）

### Step 1：閱讀核心文檔（5 分鐘）
```
必讀：
1. .antigravity/context.md           # 專案完整上下文
2. .antigravity/QUICK_START.md       # 快速啟動指南
3. README.md (專案根目錄)            # 專案概述
```

### Step 2：根據任務選擇檔案（參考 QUICK_START.md）
```
範例：全面程式碼檢查
1. docs/Code-Improvements-2026-01-14.md
2. docs/Rules.md
3. src/services/*.ts
4. src/stores/*.ts
5. 關鍵組件檔案
```

### Step 3：執行分析和修復
```
1. 分析問題（安全性、性能、程式碼品質）
2. 提供解決方案
3. 實施修復
4. 驗證結果
5. 更新文檔
6. 提交更改
```

---

## 💡 使用技巧

### 技巧 1：優先閱讀 context.md
這是最重要的檔案，包含了所有關鍵資訊。閱讀後您就能理解：
- 專案的技術架構
- 最新的改進和已知問題
- 開發規範和最佳實踐
- 如何處理不同類型的任務

### 技巧 2：使用 FILE_INDEX.md 快速查找
不確定要讀哪些檔案？使用 FILE_INDEX.md：
- 按功能查找（認證、地圖、AI 等）
- 按問題類型查找（安全性、性能等）
- 按任務類型查找（檢查、修復、新增功能等）

### 技巧 3：參考 Kiro 的工作流程
QUICK_START.md 包含了 Kiro 的完整工作流程：
- 如何分析專案
- 如何分類問題
- 如何實施修復
- 如何驗證和提交

### 技巧 4：保持文檔更新
每次修改程式碼後：
- 更新相關文檔
- 記錄改進內容
- 更新版本號
- 提交詳細的 commit message

---

## 🎯 常見任務快速參考

### 任務 A：全面程式碼檢查
```bash
# 1. 讀取核心文檔
.antigravity/context.md
docs/Code-Improvements-2026-01-14.md
docs/Rules.md

# 2. 檢查服務層
src/services/*.ts

# 3. 檢查狀態管理
src/stores/*.ts

# 4. 檢查關鍵組件
src/components/trip/AIAssistant.vue
src/views/AuthCallback.vue
```

### 任務 B：修復 OAuth 問題
```bash
# 1. 讀取問題診斷文檔
docs/Google-OAuth-Checklist.md
docs/OAuth-Fix-Summary.md

# 2. 檢查相關程式碼
src/stores/auth.ts
src/views/AuthCallback.vue
src/components/auth/AuthModal.vue
```

### 任務 C：性能優化
```bash
# 1. 讀取改進報告
docs/Code-Improvements-2026-01-14.md

# 2. 檢查範例檔案
src/services/currencyService.ts    # 快取管理範例
src/services/weatherService.ts     # 快取管理範例
src/stores/auth.ts                 # 記憶體管理範例
```

---

## 📊 檔案重要性排序

### ⭐⭐⭐ 必讀（每次任務都要讀）
```
1. .antigravity/context.md
2. .antigravity/QUICK_START.md
3. README.md (專案根目錄)
```

### ⭐⭐ 建議閱讀（根據任務類型）
```
1. .antigravity/FILE_INDEX.md
2. docs/Code-Improvements-2026-01-14.md
3. docs/Rules.md
4. docs/Planning.md
```

### ⭐ 視需求閱讀
```
1. 其他文檔檔案
2. 具體的程式碼檔案
```

---

## 🔄 更新記錄

### v1.0.0 (2026-01-14)
- ✅ 建立 context.md - 完整專案上下文
- ✅ 建立 QUICK_START.md - 快速啟動指南
- ✅ 建立 FILE_INDEX.md - 檔案索引
- ✅ 建立 README.md - 使用指南

---

## 📞 需要協助？

### 查看文檔
1. 先閱讀 `QUICK_START.md` 的相關章節
2. 查看 `FILE_INDEX.md` 找到相關檔案
3. 參考 `context.md` 的開發規範

### 常見問題
**Q: Antigravity 應該先讀哪些檔案？**
A: 必讀 `context.md` 和 `QUICK_START.md`，然後根據任務類型參考 `QUICK_START.md` 中的檔案清單。

**Q: 如何讓 Antigravity 像 Kiro 一樣工作？**
A: 閱讀 `QUICK_START.md` 中的「Kiro 的分析流程」章節，按照相同的步驟執行。

**Q: 不確定要讀哪些檔案？**
A: 使用 `FILE_INDEX.md` 按功能、問題類型或任務類型查找。

**Q: 如何保持文檔更新？**
A: 每次修改程式碼後，更新相關文檔並記錄在改進報告中。

---

## 🎓 學習資源

### Antigravity 相關
- [Antigravity 官方文檔](https://antigravity.dev)
- [AI 輔助開發最佳實踐](https://docs.antigravity.dev/best-practices)

### TravelMate 專案相關
- 專案根目錄的 `README.md`
- `docs/` 資料夾中的所有文檔
- `.antigravity/` 資料夾中的所有文檔

---

## 💬 回饋

如果您發現這些文檔有任何問題或需要改進的地方，請：
1. 更新相關文檔
2. 記錄在改進報告中
3. 提交 commit

---

**建立日期**：2026-01-14  
**版本**：v1.0.0  
**維護者**：Kiro AI Assistant  
**用途**：幫助 Antigravity AI 快速理解和處理 TravelMate 專案

---

## 🎉 開始使用

現在您已經了解了所有必要資訊，可以開始使用 Antigravity 了！

**第一步**：閱讀 `context.md` 和 `QUICK_START.md`  
**第二步**：根據任務選擇相關檔案  
**第三步**：開始分析和修復  

祝您使用愉快！🚀
