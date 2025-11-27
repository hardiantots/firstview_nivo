# 🎯 DEPLOYMENT - LANGKAH DEMI LANGKAH

## 📍 Status Saat Ini

✅ Source code sudah terhubung dengan GitHub  
✅ GitHub sudah terhubung dengan Vercel  
⏳ Perlu setup environment variables di Vercel

---

## 🚀 CARA TERCEPAT (Recommended)

### Step 1: Set Environment Variables di Vercel Dashboard

1. **Buka Vercel Dashboard:**

   ```
   https://vercel.com/dashboard
   ```

2. **Pilih project NIVO App** (atau nama project Anda)

3. **Masuk ke Settings → Environment Variables:**

   ```
   https://vercel.com/[your-username]/[project-name]/settings/environment-variables
   ```

4. **Tambahkan 5 variabel ini** (satu per satu):

   | Key                             | Value                                                       | Environments                                  |
   | ------------------------------- | ----------------------------------------------------------- | --------------------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`      | `https://glmvsterruminvfpzlzy.supabase.co`                  | ✅ Production<br>✅ Preview<br>✅ Development |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (dari .env.local) | ✅ Production<br>✅ Preview<br>✅ Development |
   | `OPENROUTER_API_KEY`            | `sk-or-v1-ae12b51b8d152306...` (dari .env.local)            | ✅ Production<br>✅ Preview<br>✅ Development |
   | `NEXT_PUBLIC_SITE_URL`          | `https://[your-domain].vercel.app`                          | ✅ Production<br>✅ Preview<br>✅ Development |
   | `AI_MODEL`                      | `openai/gpt-4o-mini`                                        | ✅ Production<br>✅ Preview<br>✅ Development |

   **Cara menambahkan:**

   - Click "Add New"
   - Isi Name (key)
   - Isi Value
   - Centang ketiga environment (Production, Preview, Development)
   - Click "Save"

5. **Setelah semua ditambahkan**, klik "Redeploy" untuk apply changes

---

### Step 2: Update Supabase Redirect URLs

1. **Buka Supabase Dashboard:**

   ```
   https://supabase.com/dashboard/project/glmvsterruminvfpzlzy
   ```

2. **Masuk ke Authentication → URL Configuration**

3. **Update Site URL:**

   ```
   https://[your-vercel-domain].vercel.app
   ```

4. **Add Redirect URLs** (tambahkan kedua URL ini):

   ```
   https://[your-vercel-domain].vercel.app/auth/callback
   http://localhost:3000/auth/callback
   ```

5. **Click Save**

---

### Step 3: Deploy!

**Option A: Automatic (Paling Mudah)**

```bash
# Push ke GitHub, Vercel akan auto-deploy
git add .
git commit -m "Configure for production deployment"
git push origin main
```

**Option B: Manual via Vercel Dashboard**

1. Go to Vercel Dashboard
2. Click "Redeploy" button
3. Wait for deployment to complete

---

### Step 4: Test Production

1. **Visit your Vercel URL:**

   ```
   https://[your-domain].vercel.app
   ```

2. **Test fitur-fitur penting:**

   - [ ] Homepage load
   - [ ] Sign up (buat akun test)
   - [ ] Sign in
   - [ ] Craving Support (test AI)
   - [ ] Data tersimpan ke database

3. **Check console untuk errors:**
   - Press F12 di browser
   - Check tab Console
   - Tidak boleh ada error merah

---

## 🆘 TROUBLESHOOTING

### ❌ "Missing environment variables"

**Solusi:**

```
1. Cek Vercel Dashboard → Settings → Environment Variables
2. Pastikan semua 5 variabel sudah diset
3. Pastikan applied ke "Production" environment
4. Click "Redeploy"
```

### ❌ "401 Unauthorized" dari Supabase

**Solusi:**

```
1. Cek NEXT_PUBLIC_SUPABASE_URL sudah benar
2. Cek NEXT_PUBLIC_SUPABASE_ANON_KEY sudah benar
3. Pastikan Supabase project tidak paused
4. Cek RLS policies di Supabase
```

### ❌ "429 Too Many Requests" dari AI

**Solusi:**

```
1. Cek OPENROUTER_API_KEY sudah benar
2. Login ke https://openrouter.ai/activity
3. Cek apakah masih ada credits
4. Top up credits jika perlu
```

### ❌ Build Fails

**Solusi:**

```bash
# Test build locally first
npm install
npm run build

# Jika berhasil local, push ke GitHub
git push origin main
```

---

## 📋 CHECKLIST LENGKAP

### Before Deployment:

- [ ] .env.local ADA dan terisi
- [ ] .env.local TIDAK di-commit ke Git
- [ ] npm run build berhasil di local
- [ ] Semua features work di local

### During Deployment:

- [ ] 5 environment variables set di Vercel
- [ ] Supabase redirect URLs updated
- [ ] Deployment berhasil (no errors)

### After Deployment:

- [ ] Production URL accessible
- [ ] Sign up/Sign in works
- [ ] AI craving support works
- [ ] Data saves to Supabase
- [ ] No console errors

---

## 🔒 KEAMANAN - PENTING!

### ✅ AMAN:

- Environment variables di Vercel Dashboard ✅
- .env.local di .gitignore ✅
- Tidak commit secrets ke Git ✅

### ❌ BAHAYA:

- Commit .env.local ke Git ❌
- Share API keys di public ❌
- Use service_role key di frontend ❌

---

## 📞 BUTUH BANTUAN?

### Dokumentasi Lengkap:

- 📖 **DEPLOYMENT_GUIDE.md** - Panduan deployment detail
- 🔒 **SECURITY.md** - Best practices keamanan
- 🚀 **QUICK_DEPLOY.md** - Quick reference
- 📝 **.env.example** - Template environment variables

### Support:

- **Vercel:** https://vercel.com/support
- **Supabase:** https://supabase.com/support
- **OpenRouter:** https://openrouter.ai/docs

---

## 🎉 SETELAH DEPLOY BERHASIL

### Update README:

Tambahkan production URL ke README.md:

```markdown
## 🌐 Live Demo

Visit: https://your-domain.vercel.app
```

### Custom Domain (Optional):

1. Vercel → Settings → Domains
2. Add your custom domain
3. Follow DNS instructions
4. Update environment variables dengan domain baru

### Monitoring:

- **Vercel Analytics:** Enable di dashboard
- **Supabase:** Monitor di Database dashboard
- **OpenRouter:** Check usage di https://openrouter.ai/activity

---

## ✨ TIPS PRO

1. **Automatic Deployments:**

   - Setiap push ke `main` branch = auto deploy
   - Vercel akan build & deploy otomatis

2. **Preview Deployments:**

   - Setiap pull request = preview deployment
   - Test changes sebelum merge ke main

3. **Environment-Specific URLs:**

   - Production: https://nivo-app.vercel.app
   - Preview: https://nivo-app-git-feature-username.vercel.app
   - Development: http://localhost:3000

4. **Rollback jika ada masalah:**
   - Vercel Dashboard → Deployments
   - Click deployment yang working
   - Click "Promote to Production"

---

**🚀 Good luck dengan deployment! Jika ada error, lihat TROUBLESHOOTING section di atas.**
