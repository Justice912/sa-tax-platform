# External Integrations

**Analysis Date:** 2026-07-02

## APIs & External Services

**None detected** - The platform contains no SDK imports for third-party APIs (Stripe, SARS efiling, Xero, etc.). All integrations are either local/in-process or stubbed for future implementation.

## Data Storage

**Databases:**
- PostgreSQL 12+ (primary)
  - Connection: Environment variable `DATABASE_URL` (required for production, optional in demo mode)
  - Client: Prisma ORM 6.16.2 (`@prisma/client`, `prisma` package)
  - Schema: `prisma/schema.prisma` (1,110 lines)
  - Seed script: `prisma/seed.ts` (for development data)

**File Storage:**
- Local filesystem only
  - Implementation: `src/modules/documents/storage-provider.ts` (LocalStorageProvider)
  - Root path: Environment variable `STORAGE_ROOT` (default: `./storage`)
  - Storage structure: `{STORAGE_ROOT}/uploads/{timestamp}-{filename}`
  - Checksum tracking: SHA256 hash computed per upload
  - No cloud storage integration (S3, GCS, Azure Blob)

**Persistence (Demo Mode):**
- JSON files for demo data survival across page refreshes
  - `storage/demo-clients.json` - Demo client records
  - `storage/demo-estates.json` - Demo estate matters
  - `storage/demo-estate-engine-runs.json` - Demo calculation runs
  - `storage/demo-individual-tax-assessments.json` - Demo tax assessments
  - Location controlled by `STORAGE_ROOT` env var

**Caching:**
- None detected - No Redis, Memcached, or similar caching layer

## Authentication & Identity

**Auth Provider:**
- NextAuth.js 4.24.13 (custom implementation)
  - Implementation: `src/lib/auth-options.ts`
  - Session strategy: JWT (stateless)
  - Sign-in page: `/login`

**Authentication Modes:**
- Credentials Provider (email + password)
  - Demo mode: In-memory demo users from `src/server/demo-data.ts`
  - Production mode: PostgreSQL User table via Prisma
  - Password verification: bcryptjs 3.0.2 (bcrypt hashing)

**Session & Token:**
- JWT tokens with custom claims:
  - `role` - User's primary role from database
  - `firmId` - Associated firm ID
  - Token expiration: NextAuth.js default (30 days)
- Middleware protection: `middleware.ts` enforces authentication on protected routes

**Roles & RBAC:**
- Database-driven roles (6 enums in schema):
  - `ADMIN` - Full system access
  - `TAX_PRACTITIONER` - Core tax operations
  - `REVIEWER` - Review workflows
  - `STAFF` - Staff support
  - `CLIENT_PORTAL` - Limited client access
  - `EXECUTOR` - Estate executor limited access
- Route-level enforcement: `src/lib/rbac.ts` (canAccessAdmin, hasPermission)
- Estate sub-routes guarded: `/estates/[estateId]` paths enforce role checks

## Monitoring & Observability

**Error Tracking:**
- None detected - No Sentry, Rollbar, or similar integration

**Logs:**
- Console-based (Prisma logs in development only)
  - Prisma log levels: ["warn", "error"] in dev, ["error"] in production
  - No structured logging library (bunyan, pino, winston)

**Audit Trail:**
- AuditLog table in PostgreSQL schema
  - Fields: action, entityType, entityId, summary, beforeData, afterData, ipAddress, userAgent, actor, timestamp
  - Manual logging required (not auto-tracked at ORM level)

## CI/CD & Deployment

**Hosting:**
- Not deployed - Development/demo only
- Capable targets: Any Node.js 18+ host (Vercel, Heroku, custom VPS)
- Desktop distribution: Windows NSIS installer (electron-builder)

**CI Pipeline:**
- None detected - No GitHub Actions, GitLab CI, or similar

**Build Artifacts:**
- Web: `npm run build` → `.next/standalone` (Next.js standalone server)
- Desktop: `npm run desktop:dist` → `dist/desktop/win-unpacked/` (installer)
- Published to: `dist/desktop/` (NSIS executable)

## Environment Configuration

**Required env vars (production):**
- `DATABASE_URL` - PostgreSQL connection string (e.g., `postgresql://user:pass@host:5432/db?schema=public`)
- `NEXTAUTH_URL` - Public URL for auth callbacks (e.g., `https://taxops.example.com`)
- `NEXTAUTH_SECRET` - Random string (min 16 chars), generated via `openssl rand -base64 32`

**Optional env vars:**
- `DEMO_MODE` - Force demo data mode (default: "true" for development)
- `STORAGE_ROOT` - Filesystem path for uploads (default: "./storage")
- `DESKTOP_NEXT_PORT` - Override default port 3300 (desktop only)
- `NODE_ENV` - "development" or "production" (controls logging verbosity)

**Secrets location:**
- `.env.local` file (not committed, listed in `.gitignore`)
- Template: `.env.example` (safe defaults for development)
- Desktop code-signing (optional): `CSC_LINK`, `CSC_KEY_PASSWORD` for Windows cert

## Webhooks & Callbacks

**Incoming:**
- None detected - No webhook endpoints for external services

**Outgoing:**
- None detected - No outbound webhook triggers to SARS or third-party systems

**Note:** Architecture supports future webhooks via `/api/*` routes (currently only auth, reports, and file generation endpoints exist).

## SARS Integration (Planned/Stubbed)

**Current Status:**
- Calculations exist for ITR-12, CGT, Estate Duty workflows
- Forms generated: Business Valuation Report (DOCX), SARS forms (simulated)
- No direct efiling or SARS API integration
- Future integration points: Executor access tokens, filing pack delivery

---

*Integration audit: 2026-07-02*
