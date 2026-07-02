# Technology Stack

**Analysis Date:** 2026-07-02

## Languages

**Primary:**
- TypeScript 5.9.3 - Primary language for all application code
- JavaScript - Build scripts and configuration (ESM + CommonJS)

**Secondary:**
- CommonJS (Node.js) - Desktop application scripts and Electron bootstrapping

## Runtime

**Environment:**
- Node.js (version unspecified in lockfile, inferred from package.json)

**Package Manager:**
- npm - Specified via package-lock.json
- Lockfile present: `package-lock.json` (422KB, up to date)

## Frameworks

**Core:**
- Next.js 16.1.6 - Web framework with App Router (standalone output)
- React 19.2.3 - UI library
- Electron 38.3.0 - Desktop application wrapper

**Build & Dev:**
- TurboWack - Webpack bundler for dev (`--webpack` flag in dev script)
- Electron Builder 24.13.3 - Desktop distribution packaging
- tsx 4.20.6 - TypeScript executor for scripts

**Testing:**
- Vitest 4.0.0 - Unit/component test runner (config: `vitest.config.ts`)
- Playwright 1.56.1 - E2E testing (config: `playwright.config.ts`)
- @testing-library/react 16.3.0 - Component testing utilities
- @testing-library/user-event 14.6.1 - User interaction simulation
- JSDOM 27.0.1 - DOM environment for tests

**Styling:**
- TailwindCSS 4.1.16 - Utility-first CSS framework
- @tailwindcss/postcss 4.1.16 - PostCSS plugin for Tailwind
- PostCSS - CSS processing (config: `postcss.config.mjs`)

**Linting & Format:**
- ESLint 9.39.1 - Code quality (config: `eslint.config.mjs`)
- eslint-config-next 16.1.6 - Next.js specific rules
- Next.js built-in formatter - No separate Prettier config found

## Key Dependencies

**Critical:**
- @prisma/client 6.16.2 - Database ORM (PostgreSQL)
- prisma 6.16.2 - Migration and schema management
- next-auth 4.24.13 - JWT-based authentication
- bcryptjs 3.0.2 - Password hashing

**Infrastructure:**
- docx 9.6.1 - DOCX document generation (estate valuation reports)
- jszip 3.10.1 - ZIP archive creation (filing packs)
- date-fns 4.1.0 - Date manipulation utilities
- lucide-react 0.511.0 - Icon library
- class-variance-authority 0.7.1 - CSS class composition
- clsx 2.1.1 - Class name utilities
- tailwind-merge 3.3.1 - TailwindCSS merge utility
- zod 4.1.8 - Schema validation (form + env validation)
- react-hook-form 7.71.2 - Form state management
- @hookform/resolvers 5.2.2 - Zod resolver for react-hook-form

## Configuration

**Environment:**
- env.ts validates via Zod schema at runtime
- Supported vars:
  - `DATABASE_URL` - PostgreSQL connection string
  - `NEXTAUTH_URL` - Auth callback URL
  - `NEXTAUTH_SECRET` - JWT signing secret (min 16 chars)
  - `DEMO_MODE` - Boolean flag for demo data mode (default: "true")
  - `STORAGE_ROOT` - Local filesystem path (default: "./storage")
  - `DESKTOP_NEXT_PORT` - Port override for desktop Next.js server (default: 3300)
  - Optional: `CSC_LINK`, `CSC_KEY_PASSWORD` - Code signing cert (Electron)

**Build:**
- `next.config.ts` - Next.js configuration (standalone output, Turbopack enabled)
- `tsconfig.json` - TypeScript compiler (strict mode, ESNext modules, bundler resolution)
- `vitest.config.ts` - Vitest configuration (jsdom environment, path alias)
- `.env.example` - Template file for env vars
- Desktop builds configured in `package.json` build section (NSIS for Windows)

## Platform Requirements

**Development:**
- Node.js (modern LTS recommended based on TypeScript 5.9)
- npm 8+ (for lockfile support)
- PostgreSQL 12+ (DATABASE_URL required if not in DEMO_MODE)

**Production:**
- PostgreSQL database (required)
- Environment secrets (NEXTAUTH_SECRET, NEXTAUTH_URL)
- Next.js standalone server runtime (Node.js 18+)

**Desktop Deployment:**
- Windows 10+ (NSIS installer target x64)
- Electron runtime bundled in .asar package
- ~150MB+ installation size (with Next.js standalone included)

---

*Stack analysis: 2026-07-02*
