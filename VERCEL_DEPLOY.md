# Deploy VaultShare Frontend to Vercel (FREE)

**⏱️ Time: ~3 minutes**  
**💰 Cost: $0/month (forever free)**

---

## Step 1: Create Vercel Account (1 min)

1. Go to **https://vercel.com**
2. Click **"Sign Up"**
3. Sign up with **GitHub** (easiest - auto-connects your repos)

---

## Step 2: Deploy Frontend (2 min)

### 2.1 Import Project

1. Click **"Add New..."** → **"Project"**
2. Select your **`vaultshare`** repository
3. Vercel will auto-detect Next.js

### 2.2 Configure Project

**Framework Preset:** Next.js (auto-detected)  
**Root Directory:** `frontend`  
**Build Command:** `npm run build` (auto-detected)  
**Output Directory:** `.next` (auto-detected)

### 2.3 Environment Variables

Click **"Environment Variables"** and add:

```bash
NEXT_PUBLIC_API_URL=https://vaultshare-api.onrender.com/api
NEXT_PUBLIC_APP_NAME=VaultShare
NEXT_PUBLIC_APP_URL=https://vaultshare.vercel.app
```

**Note:** Replace `vaultshare.vercel.app` with your actual Vercel domain (shown after deployment)

### 2.4 Deploy

1. Click **"Deploy"**
2. Wait **~2-3 minutes** for build to complete
3. Your app will be live at: **https://vaultshare.vercel.app** (or custom domain)

---

## Step 3: Update Backend CORS Settings

After deployment, go back to **Render** and update these environment variables:

```bash
CORS_ALLOWED_ORIGINS=https://vaultshare.vercel.app
FRONTEND_URL=https://vaultshare.vercel.app
ALLOWED_HOSTS=vaultshare-api.onrender.com
```

Replace `vaultshare.vercel.app` with your actual Vercel domain.

Then **manually redeploy** the backend service (or it will auto-redeploy).

---

## Step 4: Test Your App

1. Visit your Vercel URL: **https://vaultshare.vercel.app**
2. Try uploading a file
3. Share the link and test download

---

## Free Tier Limits

✅ **What's Included:**
- Unlimited bandwidth
- Unlimited deployments
- Automatic HTTPS
- Global CDN
- Custom domain support
- Preview deployments for each PR

⚠️ **Limitations:**
- 100 GB bandwidth/month (plenty for most apps)
- 6,000 build minutes/month
- No serverless function limits for hobby tier

---

## Custom Domain (Optional)

1. Go to your project settings on Vercel
2. Click **"Domains"**
3. Add your custom domain
4. Update DNS records as instructed
5. Update environment variables on both Vercel and Render

---

## Troubleshooting

### Build Fails

- Check `frontend/` directory structure
- Ensure `package.json` and `next.config.ts` are in `frontend/`
- Check build logs for missing dependencies

### API Not Connecting

- Verify `NEXT_PUBLIC_API_URL` is correct
- Check backend CORS settings on Render
- Test backend API directly: `https://vaultshare-api.onrender.com/api/health/`

### 404 on Routes

- Next.js App Router requires proper folder structure
- Check `frontend/app/` directory

---

## Next Step

**Optional: Setup Brevo Email** → See `BREVO_SETUP.md`

Or you're done! 🎉 Your app is live!

