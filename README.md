# 🔒 VaultShare

**Secure file-sharing platform with screenshot protection and comprehensive tracking**

A production-ready, FREE file-sharing platform built with Django + Next.js, featuring view-only protection, screenshot detection, and accurate access tracking.

---

## 🌟 Features

### Core Functionality
- **100% Accurate View Tracking** - All files proxied through backend (no direct URLs)
- **Screenshot Protection** - Watermarks, keyboard blocking, alerts, DevTools detection
- **View-Only Files** - Disable downloads selectively
- **Password Protection** - Optional file passwords
- **Time-Limited Access** - Set expiration times
- **View-Limited Access** - Restrict number of views
- **Email Notifications** - File access alerts (via Brevo)
- **Automatic Cleanup** - Scheduled deletion of expired files

### Security Features
- JWT-based authentication
- Backend file proxy (100% tracking accuracy)
- Screenshot detection & deterrents
- Multiple watermarks (diagonal, corners, background)
- Keyboard shortcut blocking
- DevTools detection
- IP tracking and logging
- Anti-cache headers

---

## 🏗️ Architecture

### Tech Stack
- **Backend**: Django 5.0.1 + Django REST Framework
- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Authentication**: JWT (SimpleJWT)
- **Database**: SQLite (dev) / PostgreSQL (prod - Neon.tech free tier)
- **Storage**: Local (dev) / Cloudflare R2 (prod - 10GB free + unlimited egress)
- **Email**: Brevo API (300 emails/day free)
- **Hosting**: Vercel (frontend) + Render/Railway (backend)

### Why This Stack?
- ✅ **100% FREE** - Can run entirely on free tiers
- ✅ **Simple** - Easy to understand and maintain
- ✅ **Modern** - Latest tech (Django 5, Next.js 15)
- ✅ **Scalable** - Can grow to millions of users
- ✅ **Secure** - Backend proxy ensures 100% accurate tracking
- ✅ **Better free tier** - R2 has 10GB + unlimited egress (vs Firebase 5GB + limits)

### Project Structure
```
vaultshare/
├── backend/
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py          # Shared settings
│   │   │   ├── development.py   # Dev environment (SQLite, local storage)
│   │   │   └── production.py    # Production (PostgreSQL, Firebase)
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── apps/
│   │   ├── users/               # Authentication & user management
│   │   ├── files/               # File upload, access control, Firebase integration
│   │   └── notifications/       # Email notifications (Brevo)
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── app/
│   │   ├── dashboard/          # User dashboard
│   │   ├── access/[token]/     # Public file access with screenshot protection
│   │   └── login/              # Authentication
│   ├── components/             # Reusable components
│   ├── lib/                    # Utilities
│   ├── package.json
│   └── .env.example
├── FIREBASE_QUICKSTART.md      # 5-min Firebase setup
├── BREVO_SETUP.md              # 3-min email setup (optional)
├── TECH_STACK.md               # Complete tech overview
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- Git

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/vaultshare.git
cd vaultshare
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv ../venv
source ../venv/bin/activate  # On Windows: ..\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start server
python manage.py runserver
```

Backend runs at: http://localhost:8000

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Start dev server
npm run dev
```

Frontend runs at: http://localhost:3000

## 💰 Cost: $0-5/month

### Development (Local)
- Database: SQLite (FREE - on your computer)
- Storage: Local filesystem (FREE - on your computer)
- Email: Console output (FREE - prints to terminal)
- **Total: $0**

### Production Options

#### Option 1: Maximum Free (Recommended for MVP)
```
Frontend: Vercel (FREE)
Backend: Render (FREE with 30s cold starts)
Database: Neon.tech PostgreSQL (FREE 512MB)
Storage: Cloudflare R2 (FREE 10GB + unlimited egress)
Email: Brevo (FREE 300 emails/day)

Total: $0/month
```

#### Option 2: No Cold Starts
```
Frontend: Vercel (FREE)
Backend: Railway ($5/month - always awake)
Database: Neon.tech PostgreSQL (FREE 512MB)
Storage: Cloudflare R2 (FREE 10GB)
Email: Brevo (FREE 300 emails/day)

Total: $5/month
```

**Free tier limits (very generous):**
- Cloudflare R2: 10 GB storage + unlimited downloads
- Brevo: 300 emails/day (9,000/month)
- Neon: 512 MB database
- Vercel: Unlimited builds/deploys

---

## � Environment Variables

### Backend (.env)
See `.env.example` for complete template.

**Required for local development:**
```bash
SECRET_KEY=your-secret-key-here
DEBUG=True
```

**Optional (defaults work fine):**
```bash
# Database (defaults to SQLite)
DATABASE_URL=postgresql://user:pass@localhost/vaultshare

# Storage (defaults to local filesystem)
STORAGE_BACKEND=local  # or 'r2' or 'firebase' for production
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=vaultshare

# Or use Firebase (alternative)
FIREBASE_CREDENTIALS_PATH=/path/to/firebase-credentials.json
FIREBASE_STORAGE_BUCKET=your-bucket-name

# Email (works without - just logs to console)
BREVO_API_KEY=your-brevo-api-key
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 📚 Documentation

- **[TECH_STACK.md](./TECH_STACK.md)** - Complete tech stack overview & deployment options
- **[R2_QUICKSTART.md](./R2_QUICKSTART.md)** - 3-minute Cloudflare R2 setup (recommended!)
- **[FIREBASE_QUICKSTART.md](./FIREBASE_QUICKSTART.md)** - 5-minute Firebase setup (alternative)
- **[BREVO_SETUP.md](./BREVO_SETUP.md)** - 3-minute email setup (optional)

**Note:** R2 and Brevo are OPTIONAL for local development. Everything works without them!

---

## 🚀 Deployment

### Quick Deploy (5 minutes)

1. **Push to GitHub** (you're doing this now!)
2. **Deploy Frontend to Vercel**
   - Import repository
   - Add env: `NEXT_PUBLIC_API_URL`
   - Deploy
3. **Deploy Backend to Render/Railway**
   - Connect GitHub
   - Add environment variables
   - Deploy
4. **Setup Cloudflare R2** (recommended, 3 min)
   - Follow [R2_QUICKSTART.md](./R2_QUICKSTART.md)
5. **Setup Brevo** (optional, 3 min)
   - Follow [BREVO_SETUP.md](./BREVO_SETUP.md)

Done! You have a production app running for $0-5/month.

## � Security Features

✅ JWT token authentication  
✅ Backend file proxy (100% accurate tracking)  
✅ Screenshot detection & alerts  
✅ Multiple watermarks (diagonal, corners, background)  
✅ Keyboard shortcut blocking (Cmd+Shift+3/4/5, Print Screen)  
✅ DevTools detection  
✅ Right-click disabled  
✅ Text selection disabled  
✅ Tab visibility monitoring  
✅ IP logging  
✅ Anti-cache headers  
✅ Password hashing (bcrypt)  

## � Key Design Decisions

### Why Backend Proxy?
- ✅ 100% accurate view tracking (no trust in client-side code)
- ✅ Can add watermarks server-side
- ✅ Can detect screenshot tools/headless browsers
- ✅ Prevents direct URL sharing

### Why R2 over S3/Firebase?
- ✅ More generous free tier (10 GB vs 5 GB)
- ✅ **Unlimited FREE egress** (downloads don't count!)
- ✅ No credit card required
- ✅ S3-compatible (easy migration)
- ✅ Never expires (unlike AWS 12-month trial)

### Why No Redis/Celery?
- ✅ Not needed for MVP (< 100 users)
- ✅ Keep it simple
- ✅ Add later when you scale

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please open an issue first to discuss changes.

## 💬 Support

- **Issues:** Open a GitHub issue
- **Documentation:** See `/docs` in repository
- **Guides:** Check FIREBASE_QUICKSTART.md and BREVO_SETUP.md

---

**Made with ❤️ for secure, free file sharing**
