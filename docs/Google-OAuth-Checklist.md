# Google OAuth 登入檢查清單

## 🔍 問題診斷與解決方案

### 前端程式碼檢查 ✅
- [x] OAuth 函數實作正確
- [x] 回調路由設定正確
- [x] Supabase 客戶端設定正確
- [x] 錯誤處理已改進

### Supabase 後端設定檢查 ⚠️

請登入您的 Supabase Dashboard 並檢查以下設定：

#### 1. Google OAuth Provider 設定
前往：`Authentication` > `Providers` > `Google`

必須設定：
- [ ] **啟用 Google Provider**
- [ ] **Client ID**：從 Google Cloud Console 取得
- [ ] **Client Secret**：從 Google Cloud Console 取得
- [ ] **Authorized redirect URIs**：必須包含
  ```
  https://yoyvpgbahhnqbuhcarnh.supabase.co/auth/v1/callback
  ```

#### 2. Google Cloud Console 設定
前往：https://console.cloud.google.com/apis/credentials

必須設定：
- [ ] 建立 OAuth 2.0 Client ID
- [ ] 應用程式類型：**Web application**
- [ ] **已授權的 JavaScript 來源**：
  ```
  https://your-domain.vercel.app
  http://localhost:5173
  ```
- [ ] **已授權的重新導向 URI**：
  ```
  https://yoyvpgbahhnqbuhcarnh.supabase.co/auth/v1/callback
  ```

#### 3. Supabase URL 設定
前往：`Settings` > `API`

確認：
- [ ] **Project URL** 正確：`https://yoyvpgbahhnqbuhcarnh.supabase.co`
- [ ] **Site URL** 設定正確（在 `Authentication` > `URL Configuration`）：
  ```
  生產環境：https://your-domain.vercel.app
  開發環境：http://localhost:5173
  ```
- [ ] **Redirect URLs** 包含：
  ```
  https://your-domain.vercel.app/auth/callback
  http://localhost:5173/auth/callback
  ```

### 常見問題與解決方案

#### 問題 1：點擊 Google 登入後沒有反應
**可能原因**：
- Google Provider 未啟用
- Client ID/Secret 未設定或錯誤

**解決方案**：
1. 檢查 Supabase Dashboard 的 Google Provider 設定
2. 確認 Client ID 和 Secret 正確複製
3. 檢查瀏覽器 Console 是否有錯誤訊息

#### 問題 2：跳轉到 Google 後無法返回
**可能原因**：
- Redirect URI 設定錯誤
- Google Cloud Console 的授權重新導向 URI 未包含 Supabase callback URL

**解決方案**：
1. 確認 Google Cloud Console 中的「已授權的重新導向 URI」包含：
   ```
   https://yoyvpgbahhnqbuhcarnh.supabase.co/auth/v1/callback
   ```
2. 等待 5-10 分鐘讓 Google 設定生效

#### 問題 3：返回後顯示錯誤訊息
**可能原因**：
- Site URL 或 Redirect URLs 設定錯誤
- Session 無法建立

**解決方案**：
1. 檢查 Supabase 的 Site URL 設定
2. 確認 Redirect URLs 包含您的應用程式 URL
3. 檢查瀏覽器 Console 的詳細錯誤訊息

#### 問題 4：本地開發可以但部署後失敗
**可能原因**：
- 生產環境的 URL 未加入 Redirect URLs
- Google Cloud Console 未加入生產環境網址

**解決方案**：
1. 在 Supabase Redirect URLs 加入生產環境網址
2. 在 Google Cloud Console 加入生產環境網址
3. 確認 Vercel 環境變數正確設定

### 測試步驟

1. **本地測試**：
   ```bash
   npm run dev
   ```
   - 開啟 http://localhost:5173
   - 點擊 Google 登入
   - 檢查是否正確跳轉並返回

2. **生產環境測試**：
   - 部署到 Vercel
   - 測試 Google 登入流程
   - 檢查 Network tab 是否有錯誤

3. **檢查 Console 錯誤**：
   - 開啟瀏覽器開發者工具
   - 查看 Console 和 Network tab
   - 記錄任何錯誤訊息

### 除錯技巧

1. **啟用詳細日誌**：
   在 `src/views/AuthCallback.vue` 中已加入詳細的錯誤處理

2. **檢查 URL 參數**：
   OAuth 錯誤會在 URL 中顯示，例如：
   ```
   /auth/callback?error=access_denied&error_description=...
   ```

3. **檢查 Supabase Logs**：
   前往 Supabase Dashboard > Logs > Auth Logs
   查看詳細的認證日誌

### 聯絡資訊

如果問題持續存在，請提供以下資訊：
- 瀏覽器 Console 的錯誤訊息
- Supabase Auth Logs 的相關記錄
- 是否在本地或生產環境發生
- 具體的錯誤步驟

---
**更新日期**：2026-01-14
**版本**：v1.0.0
