# Vercel 部署後 Google OAuth 跳轉問題修復

**問題**：部署到 Vercel 後，Google 登入完成會跳轉到 `http://localhost:3000/#access_token=...`  
**日期**：2026-01-14  
**狀態**：✅ 已解決

---

## 🔍 問題分析

### 症狀
- 本地開發環境 (`localhost:5173`) Google 登入正常
- 部署到 Vercel 後，Google 登入完成
- 瀏覽器跳轉到 `http://localhost:3000/#access_token=...`
- 應該跳轉到 `https://your-app.vercel.app/auth/callback`

### 根本原因
**Supabase 的 Site URL 設定錯誤**

Supabase 使用 Site URL 作為 OAuth 回調的基礎網址。如果 Site URL 設定為 `http://localhost:3000`，即使在 Vercel 上運行，OAuth 完成後也會跳轉回 localhost。

---

## ✅ 解決方案

### 步驟 1：修正 Supabase Site URL（最重要）

1. **登入 Supabase Dashboard**
   ```
   https://supabase.com/dashboard
   ```

2. **選擇您的專案**
   ```
   專案：yoyvpgbahhnqbuhcarnh
   ```

3. **前往 URL Configuration**
   ```
   左側選單：Authentication > URL Configuration
   ```

4. **修正 Site URL**
   ```
   ❌ 錯誤設定：
   http://localhost:3000
   
   ✅ 正確設定：
   https://your-app-name.vercel.app
   
   （請替換為您實際的 Vercel 網址）
   ```

5. **點擊 Save 儲存**

---

### 步驟 2：設定 Redirect URLs

在同一個頁面（URL Configuration）：

1. **Additional Redirect URLs**
   ```
   新增以下網址（每行一個）：
   
   https://your-app-name.vercel.app/**
   https://your-app-name.vercel.app/auth/callback
   http://localhost:5173/**
   http://localhost:5173/auth/callback
   ```

2. **說明**：
   - `/**` 允許所有子路徑
   - `/auth/callback` 是 OAuth 回調路徑
   - 同時保留 localhost 以便本地開發

---

### 步驟 3：確認 Google Cloud Console 設定

1. **前往 Google Cloud Console**
   ```
   https://console.cloud.google.com/apis/credentials
   ```

2. **編輯 OAuth 2.0 Client ID**

3. **已授權的 JavaScript 來源**
   ```
   確保包含：
   https://your-app-name.vercel.app
   http://localhost:5173
   ```

4. **已授權的重新導向 URI**
   ```
   確保包含：
   https://yoyvpgbahhnqbuhcarnh.supabase.co/auth/v1/callback
   ```
   
   ⚠️ 注意：這是 Supabase 的回調網址，不是您的應用網址

5. **儲存變更**

---

### 步驟 4：清除快取並測試

1. **清除瀏覽器快取**
   ```
   Chrome/Edge：
   1. 開啟開發者工具 (F12)
   2. 右鍵點擊重新整理按鈕
   3. 選擇「清除快取並強制重新整理」
   
   或者使用無痕模式測試
   ```

2. **等待設定生效**
   ```
   Supabase 設定變更可能需要 1-2 分鐘生效
   Google Cloud Console 設定可能需要 5-10 分鐘
   ```

3. **重新測試**
   ```
   1. 前往 https://your-app-name.vercel.app
   2. 點擊 Google 登入
   3. 完成 Google 授權
   4. 應該正確跳轉回 Vercel 網址
   ```

---

## 🔍 驗證檢查清單

### Supabase 設定檢查
- [ ] Site URL 設定為 Vercel 網址（不是 localhost）
- [ ] Redirect URLs 包含 Vercel 網址
- [ ] Redirect URLs 包含 `/auth/callback` 路徑
- [ ] 設定已儲存

### Google Cloud Console 檢查
- [ ] JavaScript 來源包含 Vercel 網址
- [ ] 重新導向 URI 包含 Supabase callback URL
- [ ] 設定已儲存

### Vercel 環境變數檢查
- [ ] `VITE_SUPABASE_URL` 正確
- [ ] `VITE_SUPABASE_ANON_KEY` 正確
- [ ] 其他 API Keys 正確設定

### 測試檢查
- [ ] 清除瀏覽器快取
- [ ] 使用無痕模式測試
- [ ] Google 登入成功
- [ ] 正確跳轉到 Vercel 網址
- [ ] 登入狀態正常

---

## 🐛 常見錯誤

### 錯誤 1：仍然跳轉到 localhost
**原因**：設定尚未生效或瀏覽器快取

**解決**：
1. 等待 2-3 分鐘
2. 清除瀏覽器快取
3. 使用無痕模式測試
4. 檢查 Supabase Site URL 是否真的儲存成功

### 錯誤 2：redirect_uri_mismatch
**原因**：Google Cloud Console 的重新導向 URI 設定錯誤

**解決**：
確認包含：`https://yoyvpgbahhnqbuhcarnh.supabase.co/auth/v1/callback`

### 錯誤 3：無法建立登入會話
**原因**：Redirect URLs 設定不完整

**解決**：
確保 Redirect URLs 包含：
- `https://your-app-name.vercel.app/**`
- `https://your-app-name.vercel.app/auth/callback`

---

## 📝 為什麼會發生這個問題？

### OAuth 流程說明

1. **使用者點擊 Google 登入**
   ```
   應用程式呼叫：supabase.auth.signInWithOAuth()
   redirectTo: window.location.origin + '/auth/callback'
   ```

2. **Supabase 處理請求**
   ```
   Supabase 檢查 Site URL 設定
   使用 Site URL 作為回調基礎網址
   ```

3. **跳轉到 Google**
   ```
   Google 顯示授權頁面
   ```

4. **Google 回調到 Supabase**
   ```
   Google 跳轉到：
   https://yoyvpgbahhnqbuhcarnh.supabase.co/auth/v1/callback
   ```

5. **Supabase 跳轉回應用程式**
   ```
   ❌ 如果 Site URL = localhost:3000
   跳轉到：http://localhost:3000/#access_token=...
   
   ✅ 如果 Site URL = your-app.vercel.app
   跳轉到：https://your-app.vercel.app/auth/callback
   ```

### 關鍵點
- **Site URL 決定最終跳轉位置**
- 即使程式碼使用 `window.location.origin`，Supabase 仍會使用 Site URL
- 這是 Supabase 的安全機制，防止 OAuth 跳轉到未授權的網址

---

## 🎯 最佳實踐

### 開發環境 vs 生產環境

**建議做法**：

1. **使用環境變數區分**
   ```typescript
   // 不需要修改程式碼，Supabase 會自動處理
   // 只需要在 Supabase Dashboard 設定正確的 Site URL
   ```

2. **Supabase 設定**
   ```
   Site URL：設定為主要的生產環境網址
   Redirect URLs：包含所有可能的網址（開發 + 生產）
   ```

3. **本地開發**
   ```
   本地開發時，Supabase 會檢查 Redirect URLs
   如果包含 localhost，就允許跳轉
   ```

### 多環境部署

如果您有多個環境（staging、production）：

1. **Staging 環境**
   ```
   建立獨立的 Supabase 專案
   或使用不同的 Site URL
   ```

2. **Production 環境**
   ```
   Site URL：https://your-app.vercel.app
   Redirect URLs：只包含生產環境網址
   ```

---

## 📚 相關文檔

- [Supabase Auth Configuration](https://supabase.com/docs/guides/auth/auth-helpers/auth-ui)
- [Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

## ✅ 解決確認

完成以上步驟後，您應該能夠：
- ✅ 在 Vercel 上成功使用 Google 登入
- ✅ 正確跳轉到 Vercel 網址
- ✅ 登入狀態正常保持
- ✅ 本地開發環境仍然正常運作

---

**更新日期**：2026-01-14  
**問題狀態**：✅ 已解決  
**解決方案**：修正 Supabase Site URL 設定
