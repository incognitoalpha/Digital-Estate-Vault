# Digital Estate Vault

A highly secure, zero-knowledge web application designed to safeguard your digital assets and ensure they are seamlessly transferred to designated trustees if you become unreachable. Operating as a reliable dead man's switch, Digital Estate Vault provides peace of mind through a robust and automated release mechanism.

## Key Features

- **Zero-Knowledge Architecture:** Client-side encryption ensures the server never sees your plaintext secrets.
- **Dead Man's Switch Engine:** Automated checking and escalation with customizable intervals and grace periods.
- **Granular Trustee Access:** Secure sharing of specific assets with chosen trustees only after the release conditions are met.
- **Row-Level Security (RLS):** Strict data isolation and access control enforced directly at the database layer.
- **Multi-Factor Authentication (MFA):** Mandatory TOTP for vault access.

## System Architecture

The following diagram illustrates the secure data flow and execution components of the Digital Estate Vault:

```mermaid
flowchart LR
    subgraph Client
        Owner[Owner (Browser)]
        Trustee[Trustee (Browser)]
        Crypto[Web Crypto API (AES-GCM/RSA)]
    end

    subgraph Hosting
        NextApp[Next.js App Router (TypeScript)]
    end

    subgraph Database
        Postgres[PostgreSQL + RLS]
        Auth[Supabase Auth]
        Edge[Edge Functions]
        Cron[pg_cron Scheduler]
    end

    subgraph External
        Email[Resend (Email Delivery)]
        GitHub[GitHub Actions (Keep-Alive)]
    end

    Owner -- "HTTPS + JWT" --> NextApp
    Owner -- "Encrypt/Decrypt" --> Crypto
    Crypto -. "Ciphertext only" .-> Postgres
    NextApp -- "Auth & Queries" --> Auth
    NextApp --> Postgres

    Trustee -- "Scoped Read Access" --> NextApp

    Cron -- "Triggers every 15 min" --> Edge
    Edge -- "Verifies Dead Man Switch" --> Postgres
    Edge -- "Escalation & Notifications" --> Email
    Email --> Owner
    Email --> Trustee

    GitHub -- "Periodic Ping" --> Postgres
```

## Technology Stack

- **Frontend:** Next.js 16 (App Router), React, TypeScript, Tailwind CSS
- **Backend & Database:** Supabase (PostgreSQL, Edge Functions, Auth)
- **Encryption:** Web Crypto API (AES-GCM for symmetric encryption, RSA for asymmetric key wrapping)
- **Email Delivery:** Resend
- **Testing:** Vitest, Playwright, React Testing Library
- **Deployment:** Vercel (Frontend), Supabase Cloud (Backend)

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- Git
- A Supabase account
- A Resend account
- A Vercel account

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/digital-estate-vault.git
   cd digital-estate-vault
   npm install
   ```

2. **Configure Supabase:**
   ```bash
   npm install -g supabase
   supabase login
   supabase link --project-ref your-project-ref
   supabase db push
   ```

3. **Set up Environment Variables:**
   ```bash
   cp .env.example .env.local
   ```
   *Fill in your Supabase and Resend API keys as outlined in `.env.local`.*

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

## Testing

The repository uses extensive test suites to ensure security and reliability:

- **Unit Tests:** `npm run test:unit`
- **End-to-End Tests:** `npm run test:e2e`
- **Formatting and Linting:** `npm run lint` && `npm run format:check`

## Security Posture

Digital Estate Vault is built with absolute security in mind:
- All encryption keys are derived from a distinct vault passphrase using Argon2/PBKDF2.
- Symmetric AES-GCM is used for asset data.
- Asymmetric RSA key wrapping is utilized for trustee access delegation.
- RLS policies ensure cross-tenant data isolation.

---

<!-- *For complete project requirements and detailed implementation notes, please refer to the [Product Requirements Document (PRD.md)](./PRD.md).* -->
