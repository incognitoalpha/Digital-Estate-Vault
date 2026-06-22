# Digital Estate Vault

A secure web application for storing digital asset information with a dead man's switch mechanism that automatically releases access to designated trustees if the owner becomes unreachable.

## 🎯 Project Status

**Phase:** Phase 0 - Project Setup ✓ (automated tasks complete)

See [PRD.md](../PRD.md) for the complete product requirements document.

## 🏗️ Tech Stack

- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **Backend/Database:** Supabase (PostgreSQL + Auth + Edge Functions)
- **Encryption:** Web Crypto API (client-side AES-GCM)
- **Email:** Resend
- **Hosting:** Vercel (frontend) + Supabase Cloud (backend)
- **Testing:** Vitest + Playwright + Testing Library
- **Cost:** $0/month (all free tiers)

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ and npm
- Git
- A Supabase account (free tier)
- A Resend account (free tier)
- A Vercel account (Hobby plan)

### Initial Setup

1. **Clone and install dependencies:**

```bash
cd estate-vault
npm install
```

2. **Set up Supabase:**

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your Supabase project (or create a new one)
supabase link --project-ref your-project-ref

# Push migrations (Phase 1+)
supabase db push
```

3. **Configure environment variables:**

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (keep secret!)
- `RESEND_API_KEY`: Your Resend API key
- `KEEPALIVE_SECRET`: A random secret for the keep-alive endpoint

4. **Set up Resend:**

- Sign up at [resend.com](https://resend.com)
- Add and verify your sending domain (required for production)
- Generate an API key and add to `.env.local`

5. **Set up Vercel:**

```bash
# Install Vercel CLI
npm install -g vercel

# Login and link project
vercel login
vercel link

# Add environment variables to Vercel
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add RESEND_API_KEY
vercel env add KEEPALIVE_SECRET
```

6. **Run development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📋 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check formatting
- `npm run test` - Run tests in watch mode
- `npm run test:unit` - Run unit tests once
- `npm run test:ui` - Open Vitest UI
- `npm run test:e2e` - Run end-to-end tests
- `npm run test:e2e:ui` - Open Playwright UI

## 🧪 Testing

The project includes comprehensive testing:

- **Unit tests:** Pure function tests (crypto, utils)
- **Integration tests:** Component and API tests
- **E2E tests:** Full user flow tests with Playwright
- **RLS tests:** SQL-based Row-Level Security policy tests

Run all tests before committing:

```bash
npm run test:unit
npm run test:e2e
```

## 🔒 Security Principles

1. **Client-side encryption only** - Server never sees plaintext secrets
2. **RLS enforced** - Row-Level Security on all tables, no exceptions
3. **MFA required** - TOTP mandatory for vault access
4. **Audit logging** - All sensitive operations logged
5. **Service role key isolation** - Only used in Edge Functions, never exposed to client

See [CLAUDE.md](CLAUDE.md) for detailed security guidelines.

## 🏗️ Project Structure

```
estate-vault/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth-related routes
│   ├── (dashboard)/       # Owner dashboard routes
│   ├── (trustee)/         # Trustee portal routes
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── auth/             # Auth-specific components
│   ├── vault/            # Vault-specific components
│   └── trustee/          # Trustee-specific components
├── lib/                   # Utility functions
│   ├── crypto.ts         # Client-side encryption
│   ├── supabase/         # Supabase clients
│   └── utils.ts          # General utilities
├── supabase/             # Supabase-specific files
│   ├── migrations/       # Database migrations
│   ├── functions/        # Edge Functions
│   └── seed.sql          # Seed data
├── tests/
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   ├── e2e/              # E2E tests (Playwright)
│   └── rls/              # RLS policy tests
└── .github/
    └── workflows/        # CI and keep-alive workflows
```

## 🔄 Keep-Alive Workflow

**Critical:** The GitHub Actions keep-alive workflow prevents Supabase free-tier auto-pause after 7 days of inactivity. This is essential for the dead man's switch to function.

The workflow runs every 3 days and makes a simple database query without touching check-in data.

### Setting up GitHub Secrets

Add these secrets to your GitHub repository:

1. Go to Repository Settings → Secrets and variables → Actions
2. Add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `KEEPALIVE_SECRET`

## 🚢 Deployment

### Deploy to Vercel

```bash
vercel --prod
```

Or connect your GitHub repository to Vercel for automatic deployments.

### Post-Deployment Checklist

- [ ] Verify Resend domain SPF/DKIM records
- [ ] Test keep-alive workflow manually
- [ ] Verify all environment variables are set
- [ ] Run E2E tests against production
- [ ] Set up Supabase pg_cron jobs (Phase 5+)

## 📚 Documentation

- [PRD.md](../PRD.md) - Complete product requirements
- [CLAUDE.md](CLAUDE.md) - Development guidelines and conventions
- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)

## 🤝 Contributing

This is a portfolio/demo project. When implementing features:

1. Work phase by phase as outlined in the PRD
2. Write tests alongside implementation
3. Never disable RLS policies
4. Stay on the $0 stack (free tiers only)
5. Commit with descriptive messages: `type(scope): description [Phase N]`

## 📄 License

This is a portfolio project. See LICENSE for details.

## ⚠️ Important Notes

### Free Tier Limitations

- **Vercel Hobby:** Non-commercial use only, 100GB bandwidth/mo
- **Supabase Free:** 500MB storage, auto-pauses after 7 days inactivity (keep-alive workflow handles this)
- **Resend:** 3,000 emails/mo, 100/day, 1 verified domain

### Not Included in Free Tier

- SMS notifications (Twilio requires paid account)
- Custom domain (optional, ~$10-15/year)
- Database backups (manual pg_dump recommended)

## 🔧 Troubleshooting

### Build fails with TypeScript errors

```bash
npm run build
```

Check for type errors and fix them before committing.

### Tests fail

```bash
npm run test:unit
npm run lint
```

Ensure all tests pass and code is properly formatted.

### Supabase connection issues

Verify your environment variables are correctly set in `.env.local` and match your Supabase project settings.

### Keep-alive workflow not running

Check GitHub Actions logs and verify secrets are set correctly in repository settings.

---

**Built with 💙 as a portfolio project demonstrating secure full-stack development with modern free-tier cloud services.**
