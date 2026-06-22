# Digital Estate Vault - Development Guidelines

## Project Codename

`estate-vault`

## Core Principles

### Security First

- **NEVER disable RLS policies to "make something work"**. If a feature requires disabling RLS, flag it as an open question rather than bypassing security.
- The service-role key must ONLY be used in Edge Functions/server context, never bundled to the client.
- All encryption happens client-side. The server must never see plaintext secrets.
- Every sensitive read/write must append to the audit_log table.

### Stay on the $0 Stack

- This project is designed to run entirely on free tiers (Vercel Hobby, Supabase Free, Resend Free, GitHub Actions).
- **Do not add paid dependencies** (like Twilio SMS) unless explicitly requested by the user.
- The keep-alive workflow is load-bearing - it prevents Supabase auto-pause and must never touch check-in tables.

### Testing Requirements

- A task is not "done" until its test cases pass.
- Write tests alongside implementation, not after.
- RLS policies must have dedicated SQL test scripts that attempt cross-user access and assert denial.
- Full test suite must pass before checking off a phase.

## Commit Style

```
<type>(<scope>): <description> [Phase N]

Examples:
feat(checkin): implement cron-based missed-checkin detector [Phase 4]
fix(rls): prevent trustee access before release status [Phase 1]
test(encryption): add round-trip encryption tests [Phase 3]
docs(readme): add setup instructions [Phase 10]
```

Types: feat, fix, test, docs, refactor, chore, style

## Folder Structure

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
│   ├── crypto.ts         # Client-side encryption (pure functions)
│   ├── supabase/         # Supabase clients and helpers
│   └── utils.ts          # General utilities
├── supabase/             # Supabase-specific files
│   ├── migrations/       # Database migrations
│   ├── functions/        # Edge Functions
│   └── seed.sql          # Seed data for development
├── tests/
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   ├── e2e/              # End-to-end tests (Playwright)
│   └── rls/              # RLS policy tests (SQL)
└── .github/
    └── workflows/        # CI and keep-alive workflows
```

## Development Workflow

1. Work phase by phase, top to bottom from PRD Section 7.
2. Before writing code, re-read relevant sections of the PRD.
3. When a task is fully implemented and tested, mark it `- [x]` in PRD.md and commit.
4. Run the test suite before checking off a phase's final task.

## Environment Variables

See `.env.example` for required variables. Never commit `.env.local` or any file containing actual secrets.

## Decisions and Assumptions

When a decision is ambiguous:

1. Make a reasonable default choice
2. Implement it
3. Log the assumption in PRD.md Section 13 (Open Questions)
4. Do not block progress waiting for clarification
