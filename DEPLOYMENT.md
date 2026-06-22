# Digital Estate Vault - Deployment Guide

**Version:** 1.0  
**Last Updated:** 2026-06-22

---

## Prerequisites

- GitHub account
- Vercel account (free tier)
- Supabase account (free tier)
- Resend account (free tier)
- Node.js 20+ installed locally

---

## 1. Supabase Setup

### Create Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Choose region closest to your users
4. Save your project credentials:
   - Project URL
   - Anon/Public key
   - Service role key (keep secret!)

### Run Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push

# Or manually run SQL files in Supabase SQL Editor:
# - supabase/migrations/*.sql (in order)
```

### Deploy Edge Functions

```bash
# Deploy checkin-scanner
supabase functions deploy checkin-scanner

# Deploy escalation-notifier  
supabase functions deploy escalation-notifier

# Set environment variables
supabase secrets set RESEND_API_KEY=your_resend_key
supabase secrets set RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### Configure Cron Jobs

In Supabase Dashboard → Database → Cron Jobs, create two scheduled functions:

**Checkin Scanner (every 15 minutes):**
- Schedule: `*/15 * * * *`
- Calls: checkin-scanner Edge Function

**Escalation Notifier (every hour):**
- Schedule: `0 * * * *`
- Calls: escalation-notifier Edge Function

---

## 2. Vercel Deployment

### Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=Digital Estate Vault <noreply@yourdomain.com>
```

### Deploy

```bash
# Connect to Vercel
vercel

# Deploy to production
vercel --prod

# Or push to GitHub for automatic deployment
git push origin main
```

---

## 3. Post-Deployment Testing

### Test Checklist

- [ ] Sign up new account
- [ ] Complete MFA setup
- [ ] Set vault passphrase
- [ ] Create and encrypt asset
- [ ] Invite trustee
- [ ] Perform check-in
- [ ] Verify keep-alive workflow runs
- [ ] Check RLS policies (run tests/rls/*.sql)

### Monitor Keep-Alive

GitHub Actions workflow runs every 12 hours to prevent Supabase auto-pause.

Check: Repository → Actions → Keep Alive workflow

---

## 4. Security Checklist

- [ ] All environment variables set correctly
- [ ] Service role key not exposed to client
- [ ] RLS policies tested
- [ ] HTTPS enforced (automatic on Vercel)
- [ ] MFA required for authentication
- [ ] Rate limiting active
- [ ] Audit logs enabled

---

## 5. Monitoring

### Supabase
- Monitor database size (500MB free tier limit)
- Check Edge Function logs
- Review auth.users growth

### Vercel
- Monitor bandwidth (100GB/month free)
- Check for 500 errors
- Review build times

### Resend
- Track daily email usage (100/day limit)
- Monitor monthly total (3,000/month limit)

---

## 6. Scaling Considerations

### Rate Limiting at Scale

Current in-memory rate limiting works for single-instance deployments. For horizontal scaling:

```bash
# Migrate to Upstash Redis
npm install @upstash/redis
# Update lib/rate-limit.ts
```

### When to Upgrade

**Supabase:** Upgrade when database > 500MB or need more Edge Functions  
**Vercel:** Upgrade for custom domains or higher bandwidth  
**Resend:** Upgrade when approaching 3,000 emails/month

---

## Support Resources

- Supabase Docs: https://supabase.com/docs
- Vercel Docs: https://vercel.com/docs
- Resend Docs: https://resend.com/docs
- Project Issues: GitHub Issues page

---

**Deployment Complete! 🎉**
