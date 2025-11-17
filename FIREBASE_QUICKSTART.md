# 🔥 Firebase Setup (5 Minutes)

## Quick Setup for VaultShare

### Step 1: Create Firebase Project (2 min)

1. Go to https://console.firebase.google.com/
2. Click **"Add project"**
3. Name: `vaultshare` (or anything you like)
4. **Disable** Google Analytics (not needed)
5. Click **"Create project"**

### Step 2: Enable Storage (1 min)

1. In left sidebar, click **"Storage"**
2. Click **"Get started"**
3. Click **"Next"** (production mode is fine)
4. Select location closest to you
5. Click **"Done"**

### Step 3: Set Security Rules (1 min)

1. Click **"Rules"** tab
2. Replace with this:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if false;  // Backend only access
    }
  }
}
```

3. Click **"Publish"**

> Why deny all? Your Django backend uses a service account to access files. Users get files through your API with perfect tracking!

### Step 4: Get Service Account (1 min)

1. Click ⚙️ **Settings** → **"Project settings"**
2. Go to **"Service accounts"** tab
3. Click **"Generate new private key"**
4. Save the JSON file

**⚠️ IMPORTANT:** Keep this file secret! Never commit to Git!

### Step 5: Configure Backend

#### For Local Development:

```bash
# Move the file somewhere safe
mkdir -p ~/.vaultshare
mv ~/Downloads/vaultshare-*.json ~/.vaultshare/firebase-credentials.json

# Update backend/.env
echo "STORAGE_BACKEND=firebase" >> backend/.env
echo "FIREBASE_CREDENTIALS_PATH=$HOME/.vaultshare/firebase-credentials.json" >> backend/.env
echo "FIREBASE_STORAGE_BUCKET=your-project.appspot.com" >> backend/.env
```

**Replace `your-project.appspot.com`** with your actual bucket name from Firebase Console → Storage

#### For Production (Railway/Render):

**Option A: Upload File (Easier)**
1. Upload `firebase-credentials.json` to your server
2. Set env var: `FIREBASE_CREDENTIALS_PATH=/app/firebase-credentials.json`

**Option B: Use Environment Variable (More Secure)**
```bash
# Convert to base64
cat firebase-credentials.json | base64 > firebase-creds.txt

# In your deployment platform, set:
FIREBASE_CREDENTIALS_JSON=<paste-base64-content>
```

Then update `firebase_storage.py`:
```python
# Add at the top of __init__
import json
import base64

# In __init__ method, replace credential loading:
if hasattr(settings, 'FIREBASE_CREDENTIALS_JSON') and settings.FIREBASE_CREDENTIALS_JSON:
    cred_dict = json.loads(base64.b64decode(settings.FIREBASE_CREDENTIALS_JSON))
    cred = credentials.Certificate(cred_dict)
else:
    cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
```

### Step 6: Test It!

```bash
# Start backend
cd backend
source ../venv/bin/activate
python manage.py runserver

# Upload a file through the dashboard
# Check Firebase Console → Storage to see it!
```

---

## ✅ You're Done!

**Free Tier Includes:**
- 5GB storage
- 1GB/day downloads (30GB/month)
- 50k reads/day
- 20k writes/day

**Perfect tracking because:**
- All files go through YOUR backend
- Every view/download is counted exactly
- Firebase is just storage, not access

---

## Cost After Free Tier

If you grow beyond free limits, Firebase auto-upgrades:
- Storage: $0.026/GB/month
- Downloads: $0.12/GB
- Still super cheap! 10GB + 100GB downloads = ~$12/month

---

## Complete Free Production Stack

✅ **Frontend:** Vercel (free)  
✅ **Backend:** Railway ($5/month) or Render (free with cold starts)  
✅ **Database:** Neon.tech (free forever)  
✅ **Storage:** Firebase (5GB free forever)  
✅ **Redis:** Upstash (free tier)

**Total: $0-5/month** for unlimited users! 🎉

**With 100% accurate tracking + screenshot protection!**
