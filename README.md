# 🔒 VaultShare

**Secure file-sharing platform with screenshot protection and comprehensive tracking**

A production-ready, FREE file-sharing platform built with Django + Next.js, featuring view-only protection, screenshot detection, and accurate access tracking.

---

## 🌟 Features

### Core Functionality
- **100% Accurate View Tracking** - All files proxied through backend (no direct URLs)
- **Session-Based View Counting** - Refreshes within session window don't count as new views (configurable: 5/15/30/60/120 minutes)
- **Consumer Access Control** - Require sign-in for file access and limit views per consumer
- **Real-Time Analytics** - Auto-refreshing analytics dashboard (updates every 5 seconds)
- **Screenshot Protection** - Watermarks, keyboard blocking, alerts, DevTools detection
- **View-Only Files** - Disable downloads selectively
- **Password Protection** - Optional file passwords
- **Time-Limited Access** - Set expiration times
- **View-Limited Access** - Restrict total number of views
- **Email Notifications** - File access alerts (via Brevo)
- **Automatic Cleanup** - Scheduled deletion of expired files

### Advanced Access Control
- **Require Sign-In** - Force consumers to authenticate before accessing files
- **Per-Consumer View Limits** - Restrict how many times each user can view a file (5/10/25/50/100 views)
- **Session Tracking** - Track unique sessions (not individual page refreshes)
  - Authenticated users tracked by user ID (survives IP changes, device switches)
  - Anonymous users tracked by IP address
- **Session-Grouped Analytics** - Deduplicated view logs (shows both view & download actions, hides duplicate refreshes)

### Security Features
- JWT-based authentication
- Backend file proxy (100% tracking accuracy)
- Session-based view counting (prevents refresh spam)
- Atomic database updates (F() expressions prevent race conditions)
- Screenshot detection & deterrents
- Multiple watermarks (diagonal, corners, background)
- Keyboard shortcut blocking
- DevTools detection
- IP tracking and logging
- Anti-cache headers
- Consumer-level access control

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
│   │   │   └── production.py    # Production (PostgreSQL, R2/Firebase)
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── apps/
│   │   ├── users/               # Authentication & user management
│   │   ├── files/               # File upload, access control, session tracking
│   │   │   ├── models.py        # FileUpload & AccessLog models
│   │   │   ├── views.py         # File access endpoints (validate, serve, analytics)
│   │   │   ├── serializers.py   # API serializers
│   │   │   └── migrations/      # Database migrations (includes consumer access control)
│   │   └── notifications/       # Email notifications (Brevo)
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── app/
│   │   ├── dashboard/           # User dashboard with real-time analytics
│   │   ├── access/[token]/      # Public file access with screenshot protection
│   │   └── login/               # Authentication
│   ├── components/
│   │   ├── FileUpload.tsx       # Upload form with session duration & consumer controls
│   │   └── ...                  # Other reusable components
│   ├── lib/
│   │   ├── api.ts               # API client with auto-logout
│   │   └── ...                  # Other utilities
│   ├── package.json
│   └── .env.example
├── R2_QUICKSTART.md             # 3-min Cloudflare R2 setup (recommended!)
├── FIREBASE_QUICKSTART.md       # 5-min Firebase setup (alternative)
├── BREVO_SETUP.md               # 3-min email setup (optional)
├── TECH_STACK.md                # Complete tech overview
└── README.md
```

---

## 🔑 How It Works

### Session-Based View Counting
VaultShare uses intelligent session tracking to prevent inflated view counts from page refreshes:

1. **First Access**: User views a file → creates AccessLog → increments `current_views`
2. **Within Session Window** (default 15 min): User refreshes or opens in new tab → creates AccessLog but does NOT increment `current_views`
3. **After Session Expires**: Same user accesses again → creates new session → increments `current_views`

**Session Tracking:**
- **Authenticated users**: Tracked by user ID (survives IP changes, device switches)
- **Anonymous users**: Tracked by IP address (new IP = new session)
- **Both view and download** count as session activity (either resets the timer)
- **Every access is logged** (for complete audit trail)

**Configurable Session Duration:**
- 5 minutes (quick checks)
- 15 minutes (default - typical reading time)
- 30 minutes (longer documents)
- 60 minutes (presentations)
- 120 minutes (extended sessions)

### Consumer Access Control
Control who can access your files and how often:

**Require Sign-In:**
- Force consumers to authenticate before viewing
- Track individual users (not just IP addresses)
- Prevent anonymous sharing

**Per-Consumer View Limits:**
- Limit how many times each user can view a file
- Options: 5, 10, 25, 50, or 100 views per consumer
- Authenticated users tracked by ID, anonymous by IP
- Survives device switches for signed-in users

### Real-Time Analytics
Monitor file access in real-time:
- **Auto-refresh every 5 seconds** when analytics panel is open
- **Session-grouped logs** - deduplicated view of access attempts
- **Shows both view and download** actions (even in same session)
- **Hides duplicate refreshes** within the same session window
- **Summary statistics**: Successful accesses, blocked attempts, downloads, unique IPs

### File Access Flow
```
1. Consumer clicks file link
   ↓
2. Frontend validates access (checks password, expiration, view limits)
   - No logging at this stage (prevents premature counting)
   ↓
3. Consumer clicks "View" or "Download" button
   ↓
4. Backend checks for active session
   - Has session within time window? → Log access, DON'T increment
   - No active session? → Log access, INCREMENT view count
   ↓
5. File served through backend proxy
   - 100% accurate tracking (no direct URLs)
   - Watermarks applied (if screenshot protection enabled)
   ↓
6. Analytics auto-refresh shows new access log
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

## � File Upload Options

When uploading a file, you can configure:

### Basic Settings
- **File selection** - Drag & drop or click to browse
- **Password protection** - Optional password requirement (bcrypt hashed)
- **Expiration time** - 1 hour, 24 hours, 7 days, or 30 days
- **Max views** - Total view limit (10, 25, 50, 100, 250, 500, or unlimited)

### Advanced Access Control
- **Session Duration** - Time window for view counting (5, 15, 30, 60, or 120 minutes)
  - Refreshes within this window don't count as new views
  - Default: 15 minutes (typical reading time)
- **Require Sign-In** - Force consumers to authenticate before access
  - Enables tracking by user ID (not just IP)
  - Prevents anonymous sharing
- **Max Views Per Consumer** - Limit views per individual user (5, 10, 25, 50, or 100)
  - Works with both signed-in users and anonymous (IP-based)
  - Independent of total max views

### Security Options
- **Screenshot Protection** - Enable watermarks and detection
- **Disable Download** - View-only mode (no download button)
- **Email Notifications** - Get alerted when file is accessed (requires Brevo setup)

### Example Configurations

**Quick Share (Minimal Restrictions)**
- Session Duration: 15 minutes
- Max Views: Unlimited
- No password, no sign-in required

**Confidential Document (Maximum Security)**
- Require Sign-In: ✅
- Max Views Per Consumer: 5
- Session Duration: 30 minutes
- Password: ✅
- Screenshot Protection: ✅
- Disable Download: ✅
- Expiration: 24 hours

**Presentation Viewing**
- Session Duration: 60 minutes (long viewing time)
- Max Views: 50
- Screenshot Protection: ✅
- No password (easy sharing)

## �💰 Cost: $0-5/month

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

## 🔒 Security Features

✅ JWT token authentication  
✅ Backend file proxy (100% accurate tracking)  
✅ Session-based view counting (F() expressions prevent race conditions)  
✅ Atomic database updates (no duplicate counting)  
✅ Consumer access control (require sign-in + per-user limits)  
✅ Screenshot detection & alerts  
✅ Multiple watermarks (diagonal, corners, background)  
✅ Keyboard shortcut blocking (Cmd+Shift+3/4/5, Print Screen)  
✅ DevTools detection  
✅ Right-click disabled  
✅ Text selection disabled  
✅ Tab visibility monitoring  
✅ IP logging (with session tracking)  
✅ Anti-cache headers  
✅ Password hashing (bcrypt)  
✅ Auto-logout on 401 errors (stale token handling)  

## 🎯 Key Design Decisions

### Why Backend Proxy?
- ✅ 100% accurate view tracking (no trust in client-side code)
- ✅ Can add watermarks server-side
- ✅ Can detect screenshot tools/headless browsers
- ✅ Prevents direct URL sharing
- ✅ Enables session-based tracking

### Why Session-Based Counting?
- ✅ Prevents inflated counts from page refreshes
- ✅ More accurate representation of actual viewers
- ✅ Configurable session duration (5-120 minutes)
- ✅ Still maintains complete audit trail (all accesses logged)
- ✅ Works for both authenticated and anonymous users

### Why F() Expressions for View Counting?
- ✅ Atomic database updates (prevents race conditions)
- ✅ No read-modify-write cycle (thread-safe)
- ✅ Guaranteed increment persistence
- ✅ Works correctly under high concurrency

### Why Separate validate() and serve() Endpoints?
- ✅ validate() = permission checks only (no logging)
- ✅ serve() = actual file access (logging + counting)
- ✅ Prevents premature view counting
- ✅ User sees "View" button before count increments

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
