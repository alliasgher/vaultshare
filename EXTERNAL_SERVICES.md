# 🌐 External Services Guide

## Overview

VaultShare uses several external services to provide a complete file-sharing platform. All services have generous **FREE tiers** that are sufficient for MVP and small-scale production use.

---

## Required Services

### 1. **Neon.tech** - PostgreSQL Database
**Purpose:** Production database (replaces SQLite in development)

**Free Tier:**
- 512 MB database storage
- 3 GB data transfer/month
- Unlimited projects
- Automatic backups
- **No credit card required**

**Setup Time:** 3 minutes

**When to use:**
- ✅ Production deployment
- ❌ Local development (use SQLite instead)

**Configuration:**
```bash
# .env
DATABASE_URL=postgresql://user:pass@ep-xxx.region.neon.tech/vaultshare
```

**Sign up:** https://neon.tech

---

### 2. **Cloudflare R2** - File Storage
**Purpose:** Production file storage (recommended over Firebase)

**Free Tier:**
- **10 GB** storage
- **Unlimited egress** (downloads don't count!)
- 1M Class A operations/month (uploads)
- 10M Class B operations/month (downloads)
- **No credit card required**

**Setup Time:** 3 minutes (see `R2_QUICKSTART.md`)

**Why R2 over Firebase/S3:**
- ✅ More storage (10GB vs 5GB)
- ✅ Unlimited FREE downloads (vs 1GB/day limit)
- ✅ S3-compatible API (easy migration)
- ✅ Never expires (unlike AWS 12-month trial)
- ✅ Better performance for file serving

**Configuration:**
```bash
# .env
STORAGE_BACKEND=r2
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=vaultshare
R2_PUBLIC_URL=https://your-bucket.r2.dev
```

**Sign up:** https://dash.cloudflare.com/sign-up

**Detailed Guide:** See `R2_QUICKSTART.md`

---

### 3. **Vercel** - Frontend Hosting
**Purpose:** Host Next.js frontend

**Free Tier:**
- Unlimited deployments
- Automatic SSL
- Global CDN
- Preview deployments for PRs
- 100 GB bandwidth/month
- **No credit card required**

**Setup Time:** 2 minutes

**Features:**
- ✅ Automatic deployments from GitHub
- ✅ Environment variables support
- ✅ Zero-config Next.js optimization
- ✅ Custom domains (free SSL)

**Configuration:**
```bash
# Environment Variables (in Vercel dashboard)
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
```

**Sign up:** https://vercel.com/signup

**Detailed Guide:** See `VERCEL_DEPLOY.md`

---

### 4. **Render** - Backend Hosting
**Purpose:** Host Django backend (free alternative: Railway)

**Free Tier:**
- 512 MB RAM
- Shared CPU
- Auto-sleep after 15min inactivity (30s cold start)
- Automatic deployments from GitHub
- Free SSL
- PostgreSQL available separately
- **No credit card required**

**Setup Time:** 5 minutes

**Trade-offs:**
- ✅ Completely FREE
- ❌ 30-second cold starts after inactivity
- ℹ️ Fine for MVP, demos, low-traffic apps

**Alternative:** Railway ($5/month - no cold starts)

**Configuration:**
```bash
# Environment Variables (in Render dashboard)
SECRET_KEY=your-secret-key
DEBUG=False
DATABASE_URL=postgresql://...
STORAGE_BACKEND=r2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=vaultshare
R2_PUBLIC_URL=https://your-bucket.r2.dev
BREVO_API_KEY=your-api-key (optional)
FRONTEND_URL=https://your-app.vercel.app
```

**Sign up:** https://render.com/

**Detailed Guide:** See `RENDER_DEPLOY.md`

---

## Optional Services

### 5. **Brevo** (formerly Sendinblue) - Email Notifications
**Purpose:** Send email notifications for file access

**Free Tier:**
- **300 emails/day** (9,000/month)
- Email templates
- Analytics
- API access
- **No credit card required**

**Setup Time:** 3 minutes (see `BREVO_SETUP.md`)

**When to use:**
- ✅ Production with email notifications
- ❌ Development (emails log to console)
- ❌ If you don't need email alerts

**Features Enabled:**
- 📧 File access notifications
- 📧 Screenshot attempt alerts
- 📧 View limit warnings

**Configuration:**
```bash
# .env
BREVO_API_KEY=your-api-key
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
```

**Sign up:** https://www.brevo.com/

**Detailed Guide:** See `BREVO_SETUP.md`

---

### 6. **Firebase Storage** - Alternative File Storage
**Purpose:** Alternative to Cloudflare R2 (not recommended)

**Free Tier:**
- 5 GB storage
- 1 GB/day download limit
- 50k reads/day
- 20k writes/day

**Why NOT recommended:**
- ❌ Less storage (5GB vs 10GB)
- ❌ Download limits (1GB/day vs unlimited)
- ❌ More complex setup
- ❌ Requires Google account

**When to use:**
- Only if you prefer Firebase ecosystem
- Already have Firebase account

**Configuration:**
```bash
# .env
STORAGE_BACKEND=firebase
FIREBASE_CREDENTIALS_PATH=/path/to/firebase-credentials.json
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

**Detailed Guide:** See `FIREBASE_QUICKSTART.md`

---

## Cost Summary

### Development (Local)
```
Database:  SQLite (FREE - local)
Storage:   Local filesystem (FREE - local)
Email:     Console output (FREE)
Frontend:  localhost (FREE)
Backend:   localhost (FREE)

Total: $0/month
```

### Production (Maximum FREE)
```
Database:  Neon.tech (FREE 512MB)
Storage:   Cloudflare R2 (FREE 10GB)
Email:     Brevo (FREE 300/day)
Frontend:  Vercel (FREE)
Backend:   Render (FREE with cold starts)

Total: $0/month
```

### Production (No Cold Starts)
```
Database:  Neon.tech (FREE 512MB)
Storage:   Cloudflare R2 (FREE 10GB)
Email:     Brevo (FREE 300/day)
Frontend:  Vercel (FREE)
Backend:   Railway ($5/month - always awake)

Total: $5/month
```

---

## Service Comparison

### File Storage

| Service | Free Storage | Free Egress | Limits | Recommendation |
|---------|-------------|-------------|--------|----------------|
| **Cloudflare R2** | 10 GB | **Unlimited** | 1M uploads/mo | ⭐ **Recommended** |
| Firebase | 5 GB | 1 GB/day | 50k reads/day | ⚠️ Limited |
| AWS S3 | 5 GB (12mo) | 15 GB (12mo) | Trial only | ❌ Not free long-term |

### Backend Hosting

| Service | Free Tier | Cold Starts | Limits | Recommendation |
|---------|-----------|-------------|--------|----------------|
| **Render** | 512 MB RAM | Yes (30s) | After 15min idle | ⭐ Best free option |
| Railway | $5/mo | No | 500 hours/$5 credit | ⭐ Best paid option |
| Heroku | Discontinued | - | - | ❌ No longer free |
| Fly.io | 256 MB RAM | No | 3 apps max | ✅ Alternative |

### Database

| Service | Free Storage | Limits | Recommendation |
|---------|-------------|--------|----------------|
| **Neon.tech** | 512 MB | 3 GB transfer/mo | ⭐ **Recommended** |
| Supabase | 500 MB | 2 CPU hours/day | ✅ Alternative |
| PlanetScale | 5 GB | 1B row reads/mo | ✅ Alternative |
| Railway | Included | Usage-based pricing | ✅ If using Railway backend |

---

## Quick Setup Checklist

### Minimum Required (FREE)
- [ ] **Neon.tech** - Database (3 min)
- [ ] **Cloudflare R2** - File storage (3 min)
- [ ] **Vercel** - Frontend (2 min)
- [ ] **Render** - Backend (5 min)

**Total setup time:** ~15 minutes  
**Total cost:** $0/month

### Optional but Recommended
- [ ] **Brevo** - Emails (3 min) - FREE 300/day

---

## Environment Variables Reference

### Backend (.env)
```bash
# Required
SECRET_KEY=your-django-secret-key
DEBUG=False
DATABASE_URL=postgresql://user:pass@host/db
FRONTEND_URL=https://your-app.vercel.app

# File Storage (choose one)
STORAGE_BACKEND=r2  # or 'firebase' or 'local'

# If using Cloudflare R2 (recommended)
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=vaultshare
R2_PUBLIC_URL=https://your-bucket.r2.dev

# If using Firebase (alternative)
FIREBASE_CREDENTIALS_PATH=/path/to/credentials.json
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# Email (optional)
BREVO_API_KEY=your-api-key
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
```

---

## Support & Documentation

### Official Guides
- **R2 Setup:** `R2_QUICKSTART.md` (3 min)
- **Brevo Setup:** `BREVO_SETUP.md` (3 min)
- **Firebase Setup:** `FIREBASE_QUICKSTART.md` (5 min)
- **Vercel Deploy:** `VERCEL_DEPLOY.md`
- **Render Deploy:** `RENDER_DEPLOY.md`

### Service Documentation
- **Neon.tech:** https://neon.tech/docs
- **Cloudflare R2:** https://developers.cloudflare.com/r2/
- **Vercel:** https://vercel.com/docs
- **Render:** https://render.com/docs
- **Brevo:** https://developers.brevo.com/

---

## Scaling Considerations

### 0-100 Users (Current Setup)
✅ All free tiers are sufficient  
✅ No upgrades needed  
✅ $0-5/month total cost

### 100-1,000 Users
- Consider Railway backend ($5/mo) for no cold starts
- Add Redis caching (Upstash free tier)
- Still under $10/month total

### 1,000-10,000 Users
- Upgrade Neon.tech database ($19/mo for 3GB)
- Upgrade R2 storage if needed (pay-as-you-go)
- Add Sentry error monitoring
- ~$30-50/month total

### 10,000+ Users
- Consider dedicated infrastructure
- Add load balancing
- Implement CDN caching
- Budget $100-500/month depending on traffic

---

## FAQs

**Q: Do I need a credit card for any of these services?**  
A: No! All required services offer free tiers without credit cards (Neon, R2, Vercel, Render, Brevo).

**Q: What happens if I exceed free tier limits?**  
A: Most services will either prompt you to upgrade or throttle usage. You won't be charged unexpectedly.

**Q: Can I run this completely free in production?**  
A: Yes! Use Neon + R2 + Vercel + Render = $0/month (with 30s cold starts on backend).

**Q: Should I use Railway instead of Render?**  
A: If you can afford $5/month and want no cold starts, yes. Otherwise, Render's free tier works great for MVPs.

**Q: Why R2 over Firebase?**  
A: More storage (10GB vs 5GB) + unlimited downloads vs 1GB/day limit. Better free tier overall.

**Q: Do I need Brevo for emails?**  
A: No! It's optional. Without Brevo, email notifications just log to console (useful for development).

**Q: Can I switch services later?**  
A: Yes! R2 is S3-compatible, database is PostgreSQL (standard), easy to migrate.

---

## Support

- **Issues:** Open a GitHub issue
- **Setup Help:** See individual service guides in `/docs`
- **Questions:** Check service documentation links above

---

**Made with ❤️ for free, scalable file sharing**
