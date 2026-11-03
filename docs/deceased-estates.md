# Deceased estates: liquidation workflow

This guide covers the end-to-end deceased-estate workflow added in `feature/deceased-estate-liquidation`.

## What's included

| Area | Where |
|---|---|
| Reg 5 L&D engine: solvent, s18(3), s34 insolvent, in community, redistribution, estate-duty iteration | `src/modules/estates/ld/` |
| Corrected Master's fee tariff (R600 at R250k–R400k, +R200 per R100k, max R7 000, nil for s18(3)) | `src/modules/estates/ld/fees.ts` |
| Document requests (Master, SARS estate case, L&D vouchers, finalisation) | `src/modules/estates/workflow/catalog.ts` |
| Secure upload links (hashed token, expiry, revocation, request-scoped) | `/upload/[token]`, `/api/upload-links/...` |
| Storage: Supabase Storage signed uploads, with a local-disk fallback | `src/modules/estates/workflow/storage.ts` |
| SARS deceased-estate tracker and SARS-named submission pack | Estate > *L&D Account & SARS* |
| REST API v1 with personal API keys | `/api/v1/*`, Admin > API keys |
| Claude skill + stdlib client | `skills/deceased-estate-liquidation/` |

## Deployment steps (production)

1. **Restore the Supabase project** if it is paused (`sa-tax-platform` was INACTIVE on 2026-11-03).
2. Apply the migration: `npx prisma migrate deploy`. This runs `20261103120000_deceased_estate_liquidation`, which creates six tables with RLS enabled.
3. Create a **private** Storage bucket named `estate-documents`.
4. Add these Vercel env vars (Production):
   - `SUPABASE_URL`: the project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: server-only, never exposed to the browser
   - optional `ESTATE_DOCUMENTS_BUCKET` (defaults to `estate-documents`)
5. Redeploy. Then go to Admin > API keys, create a key, and give it to the skill as `TAXOPS_API_KEY`.

Without `SUPABASE_SERVICE_ROLE_KEY`, production stores uploaded files in the database (`EstateDocumentBlob`, up to about 4 MB per file). Add the key in Vercel to switch to Supabase Storage, which supports files up to 25 MB. Demo and desktop builds write files to `STORAGE_ROOT/estate-documents`.

Demo mode: set `TAXOPS_DEMO_API_KEY` to use the API without the database.

## Review notes

- All outputs are drafts that require practitioner review.
- Three things need verifying before you rely on them:
  - The Master's fee tariff, which comes from the course notes.
  - The Insolvency Act preference ranks and caps.
  - The in-community split method.
- SARS currently takes estate cases through its online query or email, not an eFiling return. The tracker and pack follow the SARS guide (2022) and the SARS estate-case FAQ.
