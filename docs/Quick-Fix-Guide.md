# Google OAuth 快速修復指南 🚀

## 🎯 問題：Google 登入跳轉失敗

## ✅ 已完成的程式碼修復

前端程式碼已經過檢查和改進，現在具備：
- ✅ 完整的錯誤處理
- ✅ Session 驗證機制
- ✅ 友善的錯誤訊息顯示
- ✅ 改進的使用者體驗

## 🔧 立即檢查（5 分鐘）

### Step 1: 檢查 Supabase Google Provider
```
1. 開啟 https://supabase.com/dashboard
2. 選擇您的專案
3. 前往 Authentication > Providers
4. 找到 Google
5. 確認：
   ☐ Enabled 開關是否開啟
   ☐ Client ID 是否已填寫
   ☐ Client Secret 是否已填寫
```

### Step 2: 檢查 Google Cloud Console
```
1. 開啟 https://console.cloud.google.com/apis/credentials
2. 找到您的 OAuth 2.0 Client ID
3. 點擊編輯
4. 確認「已授權的重新導向 URI」包含：
   https://yoyvpgbahhnqbuhcarnh.supabase.co/auth/v1/callback
```

### Step 3: 檢查 Supabase URL 設定
```
1. 在 Supabase Dashboard
2. 前往 Authentication > URL Configuration
3. 確認：
   ☐ Site URL: https://your-domain.vercel.app (或您的網址)
   ☐ Redirect URLs 包含:
      - https://your-domain.vercel.app/auth/callback
      - http://localhost:5173/auth/callback
```

## 🧪 測試步驟

### 本地測試
```bash
# 1. 啟動開發伺服器
npm run dev

# 2. 開啟瀏覽器
# http://localhost:5173

# 3. 點擊 Google 登入按鈕

# 4. 檢查瀏覽器 Console
# 現在會顯示詳細的錯誤訊息（如果有的話）
```

### 檢查錯誤訊息
- 如果登入失敗，會在 AuthCallback 頁面顯示具體錯誤
- 開啟瀏覽器開發者工具 (F12)
- 查看 Console 標籤的錯誤訊息

## 🐛 常見錯誤與解決方案

### 錯誤 1: "redirect_uri_mismatch"
**原因**：Google Cloud Console 的重新導向 URI 設定錯誤

**解決**：
```
在 Google Cloud Console 加入：
https://yoyvpgbahhnqbuhcarnh.supabase.co/auth/v1/callback
```

### 錯誤 2: "無法建立登入會話"
**原因**：Supabase 的 Site URL 或 Redirect URLs 設定錯誤

**解決**：
```
檢查 Supabase Authentication > URL Configuration
確保包含您的應用程式網址
```

### 錯誤 3: 點擊後沒有反應
**原因**：Google Provider 未啟用或 Client ID/Secret 錯誤

**解決**：
```
1. 檢查 Supabase 的 Google Provider 是否啟用
2. 確認 Client ID 和 Secret 正確
3. 檢查瀏覽器 Console 是否有錯誤
```

## 📊 診斷工具

### 1. 瀏覽器 Console
```javascript
// 開啟開發者工具 (F12)
// 查看 Console 標籤
// 尋找以下關鍵字：
// - "OAuth error"
// - "Error during auth callback"
// - "No session found"
```

### 2. Network Tab
```
1. 開啟開發者工具 (F12)
2. 切換到 Network 標籤
3. 點擊 Google 登入
4. 查看 /auth/v1/authorize 請求
5. 檢查回應狀態碼和內容
```

### 3. Supabase Logs
```
1. Supabase Dashboard
2. Logs > Auth Logs
3. 查看最近的認證嘗試
4. 檢查錯誤訊息
```

## 📞 需要協助？

如果問題持續，請提供：
1. 瀏覽器 Console 的完整錯誤訊息
2. AuthCallback 頁面顯示的錯誤內容
3. 是在本地還是生產環境發生
4. Supabase Auth Logs 的截圖

## 📚 詳細文件

- [完整檢查清單](./Google-OAuth-Checklist.md)
- [修復總結](./OAuth-Fix-Summary.md)

---
**更新**：2026-01-14
