# 📧 Brevo Email Setup (Optional - FREE)

## Current Status

**Without Brevo:** Emails are logged to console (development mode)  
**With Brevo:** Real emails sent to users (300/day FREE)

---

## Quick Setup (3 Minutes)

### Step 1: Create Brevo Account

1. Go to https://www.brevo.com/
2. Click **"Sign up free"**
3. Enter email, create password
4. Verify your email

### Step 2: Get API Key

1. Log into Brevo dashboard
2. Click your name (top right) → **"SMTP & API"**
3. Click **"API Keys"** tab
4. Click **"Create a new API key"**
5. Name it: `VaultShare`
6. Copy the key (looks like: `xkeysib-abc123...`)

### Step 3: Configure Backend

Update `backend/.env`:

```bash
# Add these lines:
BREVO_API_KEY=xkeysib-your-actual-key-here
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
```

### Step 4: Restart Backend

```bash
cd backend
source ../venv/bin/activate
python manage.py runserver
```

---

## Test It

1. Upload a file in dashboard
2. Share file with someone
3. User gets email notification!
4. Check Brevo dashboard to see sent emails

---

## What Emails Are Sent?

✅ **File Upload Confirmation** - "Your file was uploaded"  
✅ **File Accessed** - "Someone viewed your file from IP x.x.x.x"  
✅ **File Shared** - "User X shared a file with you"  
✅ **File Expiring** - "Your file expires in 2 hours"

---

## Free Tier Limits

- **300 emails/day** (9,000/month)
- Unlimited contacts
- Email templates
- Analytics (opens, clicks)
- **No credit card required**

**Perfect for:**
- Testing
- MVP
- Up to ~100 active users

---

## Not Required For Development

The app works fine without Brevo - emails just print to your terminal instead.

**When to add Brevo:**
- When you deploy to production
- When you want real email notifications
- When you have actual users

**For now:** Keep it simple, add later when needed!
