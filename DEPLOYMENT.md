# CertMocks — Deployment Guide

## Monthly Running Cost (Small Scale)
- Vercel (hosting): **Free**
- Supabase (database): **Free** (500MB, up to 500 users)
- Gmail SMTP (emails): **Free**
- Razorpay (payments): **Free** + ~2% per transaction
- Domain: ~₹800–1,500/year
- **Total: ~₹0–500/month**

---

## Step 1 — Set Up Supabase (Free Database)

1. Go to https://supabase.com → Create free account
2. New Project → Enter name, password, region (choose Mumbai)
3. Settings → Database → Copy **Connection string (URI)**
4. It looks like: `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres`

---

## Step 2 — Deploy to Vercel (Free Hosting)

1. Push this code to GitHub (create a repo at github.com)
2. Go to https://vercel.com → Import from GitHub
3. Select your repo → Configure Environment Variables (see below)
4. Click Deploy

---

## Step 3 — Environment Variables

Set these in Vercel → Settings → Environment Variables:

```
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres

NEXTAUTH_URL=https://your-vercel-url.vercel.app
NEXTAUTH_SECRET=generate-with: openssl rand -base64 32

GOOGLE_CLIENT_ID=(optional, for Google login)
GOOGLE_CLIENT_SECRET=(optional)

RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your-razorpay-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-gmail-app-password
EMAIL_FROM=your-gmail@gmail.com
EMAIL_FROM_NAME=CertMocks

NEXT_PUBLIC_APP_URL=https://your-vercel-url.vercel.app
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=change-this-password
```

---

## Step 4 — Set Up Database

After first deployment, run:
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

Or use Vercel's Run Command feature.

---

## Step 5 — Set Up Razorpay

1. Go to https://razorpay.com → Create account
2. Dashboard → API Keys → Generate Test Keys
3. Add keys to Vercel environment variables
4. For webhooks: Dashboard → Webhooks → Add URL: `https://yoursite.com/api/webhooks/razorpay`

---

## Step 6 — Set Up Gmail SMTP

1. Gmail → Settings → See All Settings → Forwarding and POP/IMAP
2. Google Account → Security → 2-Step Verification → App Passwords
3. Generate App Password for "Mail"
4. Use that password as SMTP_PASS

---

## Step 7 — Add Your Domain (Optional)

1. Buy domain (GoDaddy, Namecheap, BigRock)
2. Vercel → Project → Settings → Domains → Add Domain
3. Copy the DNS records Vercel shows
4. Add them in your domain registrar's DNS settings
5. Update NEXTAUTH_URL and NEXT_PUBLIC_APP_URL to your domain

---

## First Steps After Deployment

1. Login at `/admin` with your ADMIN_EMAIL
2. Go to Admin → Questions → Import CSV to add your 500 questions
3. Go to Admin → Exams to create and publish your mock exams
4. Assign questions to each exam
5. Go to Admin → Settings to set your pricing
6. Test the full flow with a free account

---

## Adding Questions (CSV Format)

Create a CSV with these columns:
```
question_id,question,option_a,option_b,option_c,option_d,correct_answer,explanation,domain,topic,difficulty,source
```

Example row:
```
Q001,"What does AI stand for?","Artificial Intelligence","Automated Intelligence","Applied Intelligence","Advanced Intelligence",A,"AI stands for Artificial Intelligence...","AI Strategy & Planning","AI Basics","EASY",""
```

Upload at: Admin → Questions → Import CSV

---

## Security Checklist

- [ ] Change ADMIN_PASSWORD immediately after first login
- [ ] Use a strong NEXTAUTH_SECRET (32+ chars)
- [ ] Switch Razorpay to LIVE keys when ready to go live
- [ ] Enable HTTPS (automatic on Vercel)
- [ ] Set up webhook signature verification (already in code)

<!-- deploy trigger: quiz refresh and availability badge fixes -->

<!-- deploy trigger: completed quiz status precedence regression fix -->

<!-- deploy trigger: grouped 40-question and full-length mock exam UI -->

<!-- deploy trigger: mock publish import and practice question visibility -->

<!-- staging deploy trigger: signup session isolation -->
