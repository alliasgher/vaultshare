# 🚀 VaultShare Tech Stack

## Current Setup (Simple & FREE)

### Backend
- **Django 5.0.1** - Web framework
- **Django REST Framework** - API
- **SQLite** - Database (development)
- **PostgreSQL** - Database (production via Neon.tech)
- **Firebase Storage** - File storage (5GB FREE)
- **Python 3.12** - Language

### Frontend  
- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Axios** - API client

### Optional Services
- **Brevo** - Email notifications (300/day FREE)
- **Sentry** - Error monitoring (optional)

---

## What's NOT Being Used (Kept Simple)

❌ **Redis** - Not needed for MVP  
❌ **Celery** - Background tasks run synchronously  
❌ **AWS S3** - Using Firebase instead  
❌ **Complex caching** - Using Django's dummy cache  

---

## Deployment Options (All FREE Tiers)

### Option 1: Maximum Free (Recommended)
```
Frontend: Vercel (FREE)
Backend: Render (FREE with cold starts)
Database: Neon.tech (FREE 512MB)
Storage: Firebase (FREE 5GB)
Email: Brevo (FREE 300/day)

Total: $0/month
```

### Option 2: No Cold Starts
```
Frontend: Vercel (FREE)
Backend: Railway ($5/month)
Database: Neon.tech (FREE 512MB)
Storage: Firebase (FREE 5GB)
Email: Brevo (FREE 300/day)

Total: $5/month
```

### Option 3: All Railway (Simplest)
```
Frontend: Vercel (FREE)
Backend + Database: Railway ($5-10/month)
Storage: Firebase (FREE 5GB)
Email: Brevo (FREE 300/day)

Total: $5-10/month
```

---

## Features Implemented

✅ **100% Accurate View Tracking** - All files proxied through backend  
✅ **Screenshot Protection** - Watermarks, keyboard blocking, alerts  
✅ **View-Only Files** - Disable downloads  
✅ **Password Protection** - Optional file passwords  
✅ **Expiry & View Limits** - Auto-cleanup  
✅ **Email Notifications** - File access alerts (with Brevo)  
✅ **JWT Authentication** - Secure API  
✅ **File Sharing** - Share links with access tokens  

---

## Development Setup

```bash
# Backend
cd backend
python -m venv ../venv
source ../venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Frontend
cd frontend
npm install
npm run dev
```

**Runs on:**
- Backend: http://localhost:8000
- Frontend: http://localhost:3000

---

## Production Setup

See individual guides:
- **Firebase:** `FIREBASE_QUICKSTART.md` (5 min)
- **Brevo Email:** `BREVO_SETUP.md` (3 min)
- **Deployment:** Choose platform, connect GitHub, done!

---

## File Storage Strategy

### Development (Local)
```
Storage: media/uploads/{user_id}/{filename}
Cost: $0 (uses your disk)
```

### Production (Firebase)
```
Storage: Firebase Storage
Path: uploads/{user_id}/{date}/{uuid}.ext
Cost: FREE (5GB + 30GB downloads/month)
```

**Why Firebase?**
- ✅ FREE 5GB storage (forever)
- ✅ FREE 1GB/day downloads
- ✅ Global CDN included
- ✅ No credit card required
- ✅ Never expires (unlike AWS 12-month trial)

---

## Security Features

🔒 **JWT Authentication** - Secure API access  
🔒 **Password Hashing** - bcrypt for file passwords  
🔒 **Access Tokens** - Unique per file  
🔒 **View Limits** - Auto-enforced  
🔒 **Expiry Times** - Auto-cleanup  
🔒 **Screenshot Detection** - Keyboard monitoring  
🔒 **Watermarks** - Visual deterrents  
🔒 **IP Logging** - Track all access  
🔒 **Headers** - Anti-cache, anti-frame policies  

---

## Scalability Path

### Current (0-100 users)
- SQLite/PostgreSQL
- No caching
- Synchronous tasks
- **Cost: $0-5/month**

### Phase 2 (100-1000 users)
- Add Redis caching
- Keep synchronous tasks
- **Cost: $5-15/month**

### Phase 3 (1000+ users)
- Redis + Celery
- Background jobs
- Rate limiting
- **Cost: $15-30/month**

**Key:** Start simple, scale when needed!

---

## Why This Stack?

✅ **Simple** - Easy to understand and maintain  
✅ **FREE** - Can run on free tiers  
✅ **Modern** - Latest tech (Django 5, Next.js 15)  
✅ **Scalable** - Can grow to millions of users  
✅ **Secure** - Industry best practices  
✅ **Fast** - Optimized for performance  

---

## Summary

**Minimum to run:**
- Django backend
- SQLite database  
- Firebase storage
- Next.js frontend

**Total cost:** $0-5/month  
**Setup time:** 30 minutes  
**Perfect for:** MVP, testing, small projects  

**Add when you grow:**
- Brevo emails (still free!)
- Redis caching
- Celery background tasks
- PostgreSQL production database

🎉 **You have a production-ready file sharing platform for FREE!**
