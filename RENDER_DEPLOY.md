# Deploy VaultShare to Render (FREE)

**⏱️ Time: ~5 minutes**  
**💰 Cost: $0/month (with cold starts after 15 min inactivity)**

---

## Step 1: Push Code to GitHub (1 min)

```bash
cd /Users/admin/Desktop/vaultshare
git add .
git commit -m "Add Render deployment config"
git push origin main
```

---

## Step 2: Create Render Account (1 min)

1. Go to **https://render.com**
2. Click **"Get Started for Free"**
3. Sign up with **GitHub** (easiest - auto-connects your repos)

---

## Step 3: Deploy Backend (3 min)

### 3.1 Create New Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your **`vaultshare`** repository
3. Render will auto-detect the `render.yaml` file

### 3.2 Configure Environment Variables

Click **"Environment"** tab and add these:

**Required Variables:**

```bash
# R2 Storage (copy from your .env file)
R2_ACCOUNT_ID=e9a14454dfb1fe6e18ba22ca6d525f06
R2_ACCESS_KEY_ID=32053dd8398c64ea87901a6d058b0ad0
R2_SECRET_ACCESS_KEY=cf72aa0eecc64298bfe90d037bde60b55869d7423647c4c946181f09bd36970f
R2_BUCKET_NAME=vaultshare

# Backend URL (will be: https://vaultshare-api.onrender.com)
ALLOWED_HOSTS=vaultshare-api.onrender.com

# Frontend URL (will set after Vercel deployment)
CORS_ALLOWED_ORIGINS=https://vaultshare.vercel.app
FRONTEND_URL=https://vaultshare.vercel.app
```

**Optional Variables:**

```bash
# Email (Brevo - optional)
BREVO_API_KEY=your_brevo_api_key_here
DEFAULT_FROM_EMAIL=noreply@vaultshare.app
```

**Note:** Render auto-generates `SECRET_KEY` and `DATABASE_URL` (no need to add manually)

### 3.3 Deploy

1. Click **"Create Web Service"**
2. Wait **~3-5 minutes** for build to complete
3. Your API will be live at: **https://vaultshare-api.onrender.com**

---

## Step 4: Test Your API

Once deployed, test it:

```bash
curl https://vaultshare-api.onrender.com/api/health/
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "storage": "r2"
}
```

---

## Free Tier Limits

✅ **What's Included:**
- 512 MB RAM
- Shared CPU
- PostgreSQL database (256 MB)
- SSL certificate (auto-renewed)
- Custom domain support

⚠️ **Limitations:**
- **Cold starts:** Service sleeps after 15 min inactivity (~30s wake time)
- **750 hours/month:** Plenty for low-traffic apps
- **Build minutes:** 400 min/month (each deploy = ~2 min)

---

## Troubleshooting

### Build Fails

Check build logs for errors:
- Missing dependencies? Check `requirements.txt`
- Database errors? Render auto-creates DB, no action needed

### Service Won't Start

Check service logs:
- `ALLOWED_HOSTS` must include your Render URL
- `DATABASE_URL` should be auto-set by Render

### Files Not Uploading

- Check R2 credentials are correct
- Verify `STORAGE_BACKEND=r2` in environment variables

---

## Next Step

**Deploy Frontend to Vercel** → See `VERCEL_DEPLOY.md`

