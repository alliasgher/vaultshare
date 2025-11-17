# 🚀 Cloudflare R2 Setup (3 minutes)

**Cloudflare R2** is S3-compatible object storage with a more generous FREE tier than Firebase!

## Why R2?

✅ **10 GB FREE storage** (vs Firebase 5 GB)  
✅ **Unlimited FREE egress** (downloads don't count!)  
✅ **No credit card required** for free tier  
✅ **S3-compatible API** (easy integration)  
✅ **1M Class A operations/month** (PUT, LIST)  
✅ **10M Class B operations/month** (GET, HEAD)  

**Perfect for file sharing apps like VaultShare!**

---

## 📝 Setup Steps

### 1. Create Cloudflare Account (1 minute)

1. Go to https://dash.cloudflare.com/sign-up
2. Sign up (free account, no credit card needed)
3. Verify email

### 2. Create R2 Bucket (1 minute)

1. In Cloudflare dashboard, go to **R2** (left sidebar)
2. Click **"Create bucket"**
3. Bucket name: `vaultshare` (or your preferred name)
4. Location: **Automatic** (recommended)
5. Click **"Create bucket"**

### 3. Get API Credentials (1 minute)

1. In R2 dashboard, click **"Manage R2 API Tokens"**
2. Click **"Create API token"**
3. Token name: `vaultshare-backend`
4. Permissions: **Object Read & Write**
5. Specific buckets: Select `vaultshare` (your bucket)
6. Click **"Create API Token"**

**Save these values (shown only once!):**
- ✅ Access Key ID
- ✅ Secret Access Key
- ✅ Account ID (also shown in R2 dashboard URL)

---

## 🔑 Environment Variables

Add to your backend `.env` file:

```bash
# Storage Backend
STORAGE_BACKEND=r2

# Cloudflare R2
R2_ACCOUNT_ID=your-account-id-here
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_BUCKET_NAME=vaultshare
```

### Where to find Account ID:

Look at your R2 dashboard URL:
```
https://dash.cloudflare.com/[ACCOUNT_ID]/r2
                          ^^^^^^^^^^^
                          This is your Account ID
```

---

## ✅ Test It Works

```bash
# In your backend directory
cd backend
source ../venv/bin/activate
python manage.py shell
```

```python
# Test R2 connection
from apps.files.r2_storage import R2StorageManager
from io import BytesIO

# Create manager
r2 = R2StorageManager()

# Test upload
test_content = BytesIO(b"Hello R2!")
r2.upload_file(test_content, "test/hello.txt", "text/plain")
print("✅ Upload successful!")

# Test download
content = r2.download_file("test/hello.txt")
print(f"✅ Downloaded: {content.decode()}")

# Test delete
r2.delete_file("test/hello.txt")
print("✅ Delete successful!")
```

---

## 🌐 Production Deployment

### Vercel (Frontend)
No changes needed! R2 is backend-only.

### Render/Railway (Backend)

Add environment variables:
```bash
STORAGE_BACKEND=r2
R2_ACCOUNT_ID=abc123...
R2_ACCESS_KEY_ID=def456...
R2_SECRET_ACCESS_KEY=ghi789...
R2_BUCKET_NAME=vaultshare
```

---

## 💰 Cost Breakdown

### FREE Tier (Forever!)
- Storage: **10 GB**
- Class A operations (PUT, LIST): **1 million/month**
- Class B operations (GET, HEAD): **10 million/month**
- **Egress: UNLIMITED and FREE!** 🎉

### Beyond Free Tier (if you grow)
- Storage: $0.015/GB/month
- Class A operations: $4.50 per million
- Class B operations: $0.36 per million
- Egress: **Still FREE!** (unlike S3/Firebase)

**For 10K users sharing files:**
- Estimated cost: $1-5/month (vs $20-50 on S3)

---

## 🔧 Troubleshooting

### "Access Denied" Error
- Check API token has **Object Read & Write** permissions
- Verify token is scoped to your bucket
- Confirm Account ID is correct

### "Bucket Not Found"
- Check `R2_BUCKET_NAME` matches exactly (case-sensitive)
- Ensure bucket exists in R2 dashboard

### Connection Timeout
- Check firewall isn't blocking Cloudflare IPs
- Verify `R2_ACCOUNT_ID` is correct in endpoint URL

---

## 🎯 Next Steps

1. ✅ Upload a test file through your app
2. ✅ Verify file appears in R2 dashboard
3. ✅ Test file download/viewing
4. ✅ Check access logs work correctly

---

## 📚 Resources

- [R2 Documentation](https://developers.cloudflare.com/r2/)
- [S3 API Compatibility](https://developers.cloudflare.com/r2/api/s3/)
- [Pricing Details](https://developers.cloudflare.com/r2/pricing/)

---

**That's it! You now have 10 GB of FREE cloud storage with unlimited downloads!** 🚀
