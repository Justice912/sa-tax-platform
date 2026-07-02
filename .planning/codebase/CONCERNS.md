# Codebase Concerns

**Analysis Date:** 2026-07-02

## Critical Performance Issues

### 1. Monolithic Tax-Tools Component (2,148 lines)

**Files:** `src/components/individual-tax/tax-tools.tsx`

**Issue:** Single component manages all state (trips, medical credits, retirement, CGT, provisional tax, rental, home office) across 8 calculator tabs. Full component re-renders on every keystroke.

**Impact:**
- All users experience laggy UI when entering data in any field
- CSV import with 500+ trips becomes unusable (row-by-row renders)
- Mobile responsiveness severely degraded
- Memory footprint grows with trip count (no cleanup)

**Fragile areas:**
- Line 198-289: 13 independent useState calls with no separation of concerns
- Lines 638-653: `filteredTrips` and `monthlyData` recalculated on every render (no memoization)
- Lines 921 and 1194: Trip tables map entire arrays without virtualization/pagination

**Safe modification path:**
1. Split into 8 tab-specific sub-components (TravelLogbook, MedicalCredits, etc.)
2. Use `useMemo` for derived calculations (filteredTrips, monthlyData)
3. Implement react-virtual or similar for trip lists >100 items
4. Move calculator logic to custom hooks (useTravel, useMedical, etc.)
5. Add `key={t.id}` instead of `key={i}` for imported trips (line 923)

**Test coverage gap:** No unit tests for calculator logic. Trip filtering/sorting untested.

---

### 2. Naive CSV Import (No Quote Handling)

**Files:** `src/components/individual-tax/tax-tools.tsx` (lines 565-571)

**Issue:** Uses `.split(",")` directly without handling quoted fields. Breaks on:
- Locations with commas: `"Cape Town, South Africa"` parses as 2 columns
- Purpose fields containing commas
- No Excel support (CSV-only)

**Current code:**
```typescript
const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
const rows = lines.slice(1).map((l) => {
  const v = l.split(",").map((x) => x.trim());
  const o: Record<string, string> = {};
  headers.forEach((h, i) => (o[h] = v[i] || ""));
  return o;
});
```

**Impact:**
- Users cannot import logs with real South African city names (Johannesburg, Cape Town, etc.)
- Silent data corruption (fields shift silently without error)
- No validation feedback

**Fix approach:**
- Replace with `papaparse` or `csv-parser` library
- Add pre-flight validation (required columns, date format)
- Show preview with auto-detection confidence scores
- Support Excel via `xlsx` library

---

### 3. Date Parsing on Every Render

**Files:** `src/components/individual-tax/tax-tools.tsx` (lines 642, 648)

**Issue:** `new Date(t.date)` called on every filter/sort operation for every trip. Large logs parse dates hundreds of times per second.

**Current code:**
```typescript
.filter((t) => filterMonth === "all" || new Date(t.date).getMonth() === parseInt(filterMonth))
.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

// Plus in monthlyData (line 648):
const mt = trips.filter((t) => new Date(t.date).getMonth() === i);
```

**Impact:** Perceptible lag with 200+ trips, freezing with 500+ trips.

**Fix approach:**
- Parse dates once on import: `interface Trip { date: string; dateParsed: number; }`
- Use numeric timestamps for comparisons
- Cache month calculations

---

### 4. No Trip Data Persistence

**Files:** `src/components/individual-tax/tax-tools.tsx` (line 198)

**Issue:** All trip state is `useState` only. Refreshing the page loses all entered data.

**Impact:**
- Users manually entering 50+ trips cannot refresh without data loss
- Import workflow is fragile (file upload, classification, then lose on navigate)
- No undo/recovery mechanism
- Severely impacts user trust and usability

**Current approach:** `const [trips, setTrips] = useState<Trip[]>([]);`

**What exists:** Repository layer (see `src/modules/individual-tax/repository.ts`) handles demo data persistence to `storage/demo-individual-tax-assessments.json`, but TaxTools component doesn't integrate with it.

**Safe fix approach:**
1. Create `useTripsPersistence` hook that syncs to localStorage/IndexedDB during edit
2. Add `saveTrips()` button with success feedback
3. Integrate with `IndividualTaxRepository.createAssessment()` on finalize
4. Implement `beforeunload` warning if unsaved changes exist

**Priority:** HIGH - This is a show-stopper for production use.

---

## Fragile Areas

### 5. Travel Schedule Uses Crude Allowance × Ratio

**Files:** `src/modules/individual-tax/schedules/travel-schedule.ts`

**Issue:** Implements only basic `allowance × (businessKm / totalKm)` estimate. SARS requires either:
1. **Deemed cost method** (vehicle value brackets → fixed costs + fuel + maint per km)
2. **Actual cost method** (prove receipts)

**Current code (lines 32-40):**
```typescript
const businessRatio = input.totalKilometres > 0
  ? Math.min(1, input.businessKilometres / input.totalKilometres)
  : 0;
const estimatedClaim = input.travelAllowance * businessRatio;
```

**Impact:**
- Grossly underestimates actual deductible costs (allowance is often R1,500/month, actual deemed cost can be R8,000+/month)
- Tax assessments will be challenged by SARS if not manually corrected
- No validation that claimed amount exceeds calculated deduction

**Fix approach:**
1. Rename current logic to `estimateByAllowanceRatio()` (for quick estimates only)
2. Implement `calculateByDeemedCost()` using vehicle value + deemed cost table from tax-tools.tsx (lines 19-29)
3. Implement `calculateByActualCost()` (expense reconciliation workflow)
4. Add warnings when claimed allowance exceeds deduction thresholds
5. Reference SARS ITR12 Schedule 3 guidance

**Priority:** MEDIUM - Affects all travel claims but workaround exists (manual review/correction).

---

### 6. Weak ID Generation (Race Condition Risk)

**Files:**
- `src/components/individual-tax/tax-tools.tsx` (lines 324, 591)
- `src/modules/estates/repository.ts` (multiple)
- `src/modules/clients/client-service.ts`

**Issue:** IDs use `Date.now() + Math.random()` and `Date.now() + i + Math.random()`, which can collide:
- Two trips created in same millisecond get identical base timestamp
- Math.random() provides only ~16 bits of entropy
- IDs are floats (323 + 0.123), not cryptographically sound

**Current code (tax-tools.tsx line 591):**
```typescript
id: Date.now() + i + Math.random(),
```

**Impact:**
- Trip edit/delete targets wrong record if IDs collide
- Demo data merges silently overwrite records with same ID
- No guaranteed uniqueness in concurrent scenarios

**Safe fix approach:**
1. Use `crypto.randomUUID()` (browser) or `randomBytes().toString('hex')` (Node.js)
2. Or use Prisma's `@db.Uuid` with server-side generation
3. For demo data: prefix IDs with namespace (`trip_`, `estate_`)

**Priority:** MEDIUM - Collision probability low but impact high (data loss).

---

### 7. No Error Handling in TaxTools Component

**Files:** `src/components/individual-tax/tax-tools.tsx`

**Issue:** Zero try-catch blocks. Any error in:
- Trip date parsing
- CSV import parsing
- Number parsing
- API calls (if added)

...will crash silently or show blank/NaN values.

**Current state:** No error boundaries, no validation.

**Impact:**
- Corrupt CSV silently produces blank rows
- Invalid dates show as "NaN" without user feedback
- Mathematical errors (divide by zero) unhandled

**Example fragility (line 642):**
```typescript
new Date(t.date).getMonth() === parseInt(filterMonth)  // If t.date is invalid, getMonth() returns NaN
```

**Fix approach:**
1. Add input validation at import boundary (date format, numeric fields)
2. Wrap calculations in try-catch with `notify(error, "error")`
3. Add React Error Boundary around entire TaxTools
4. Validate CSV columns before processing

---

### 8. Demo Data Hardcoded to Disk (Not Scalable)

**Files:**
- `src/modules/individual-tax/repository.ts` (lines 30-77)
- `src/modules/estates/repository.ts` (similar pattern)
- `src/modules/clients/client-service.ts`

**Issue:** Demo mode persists to JSON files (`storage/demo-*.json`) using synchronous `fs` calls. In production-like scenarios:
- No atomic writes (partial corruption risk)
- No concurrent access control (race conditions if parallel requests)
- No schema validation on read (can load corrupt data)
- File system access from server action context may fail

**Current code (repository.ts lines 75-76):**
```typescript
fs.mkdirSync(path.dirname(filePath), { recursive: true });
fs.writeFileSync(filePath, JSON.stringify(records, null, 2), "utf8");
```

**Impact:**
- Simultaneous user actions may corrupt demo data files
- Demo mode not suitable for multi-user scenarios
- Migration to Prisma/production DB unclear

**Safe approach:**
1. Keep JSON for seeding/export only
2. Load demo data into in-memory store or SQLite for multi-session safety
3. Add migration guide: "To run with real data, set `DATABASE_URL` and disable `DEMO_MODE`"

---

## Security Concerns

### 9. Hardcoded Demo Credentials in Code

**Files:** `src/lib/auth-options.ts` (line 34)

**Issue:** Demo passwords hardcoded. While marked as demo-only, being in version control is poor practice.

**Current code:**
```typescript
if (!demoUser || parsed.data.password !== demoUser.password) {
  return null;
}
```

**Credentials stored in:** `src/server/demo-data.ts` (referenced but not shown; assume includes plaintext passwords)

**Impact:** Anyone cloning repo sees demo credentials. Production builds must never use `isDemoMode=true`.

**Fix approach:**
1. Move demo credentials to `demo-data.ts` only (not auth-options.ts)
2. Add BUILD_TIME check: fail if `DEMO_MODE=true` and `NODE_ENV=production`
3. Document: "Demo mode is for local development only. Never deploy with DEMO_MODE=true."

---

### 10. File Upload Storage Path Traversal Risk (Low Risk)

**Files:** `src/modules/documents/storage-provider.ts` (line 34)

**Issue:** File name sanitization is minimal: `.replace(/\s+/g, "-").toLowerCase()`. Does not prevent:
- `../../etc/passwd` (path traversal, but partially mitigated by basename logic)
- Unicode homoglyphs
- Very long names (resource exhaustion)

**Current code:**
```typescript
const safeName = input.fileName.replace(/\s+/g, "-").toLowerCase();
const storageKey = `uploads/${stamp}-${safeName}`;
```

**Impact:** Low in practice because:
1. Timestamp prefix makes real path traversal unlikely
2. Files stored under `storage/uploads/` (not web-accessible by default)
3. No direct download by user-supplied filename

But could improve:

**Fix approach:**
1. Use `path.basename()` to strip directory components
2. Whitelist file extensions (.pdf, .csv, .xlsx, .docx)
3. Add max file size enforcement (currently unbounded)
4. Validate MIME types on upload

---

## Tech Debt

### 11. Multiple Large Components Without Splitting

**Files:**
- `src/components/individual-tax/tax-tools.tsx` (2,148 lines)
- `src/components/individual-tax/estimate-wizard.tsx` (1,084 lines)
- `src/components/reports/estates/valuation-report.tsx` (662 lines)
- `src/components/estates/phase2/estate-valuation-workspace.tsx` (534 lines)

**Issue:** Large components become unmaintainable. Tax-tools is severely problematic, but others approaching limits too.

**Impact:**
- Difficult to test individual features
- Code reuse across calculators minimal
- Cognitive load on developers high
- Bundle size penalty if not properly tree-shaken

**Fix approach:** Prioritize tax-tools (see issue #1), then:
1. Extract estimate-wizard form steps into sub-components
2. Extract valuation report sections into sub-components
3. Create shared layout components to reduce duplication

---

### 12. CSV Import Workflow Is Fragile

**Files:** `src/components/individual-tax/tax-tools.tsx` (lines 556-616)

**Issue:** Three-step workflow (upload → classify → import) is easy to lose data:
1. User uploads CSV
2. User classifies trips (step 2: setUploadStep(2))
3. **If user navigates away or crashes at step 2, all work is lost** (importTrips state lost)

**Current flow:**
```typescript
setUploadData({ headers, rows, name: file.name });
setUploadStep(1);  // User now classifies
setImportTrips(imp);
setUploadStep(2);  // User reviews and clicks Import
setTrips((p) => [...p, ...importTrips]);  // Data saved
```

**Impact:** Users re-import same file multiple times if UI crashes, creating duplicates.

**Fix approach:**
1. Auto-save importTrips to localStorage at each step
2. Restore from localStorage on component mount
3. Add "Clear import" button to intentionally reset
4. Prevent duplicate rows by trip date + from + to + distance hash

---

### 13. Missing Boundary Tests Between Modules

**Files:** 
- `src/modules/individual-tax/repository.ts`
- `src/modules/individual-tax/calculation-service.ts`
- `src/components/individual-tax/tax-tools.tsx`

**Issue:** Tax-tools component accepts user input → passes to calculation-service → stores in repository. No integration tests verify the full flow.

**What's tested:**
- Unit tests exist for calculation-service (inferred from patterns)
- No test for: form input → calculation → persistence → retrieval

**Impact:** Breaking changes in repository interface silently break UI.

**Fix approach:** Add integration test:
```typescript
// Create a trip in UI
// Finalize to assessment
// Query repository
// Verify round-trip integrity
```

---

### 14. "Review Required" Flags Are Passive

**Files:** `src/modules/individual-tax/calculation-service.ts` (line 33)

**Issue:** Every line item has `reviewRequired: true` but there's no enforcement. Code allows final submission without review.

**Current code:**
```typescript
const makeLine = (...) => {
  return {
    code,
    description,
    computations,
    amountAssessed: r2(amountAssessed),
    reviewRequired: true,  // Flag set but never enforced
    sourceReference,
  };
};
```

**Impact:** System is compliant by design (requires review for SARS filings) but UI doesn't enforce it.

**Fix approach:**
1. Add `reviewedAt: string | null` and `reviewedBy: string` fields
2. Block submission if any `reviewRequired: true && reviewedAt: null`
3. Add audit trail: who reviewed, when, what changes made
4. SARS filing proof could reference review signatures

---

## Test Coverage Gaps

### 15. No Unit Tests for Travel Deduction Logic

**Files:** `src/modules/individual-tax/schedules/travel-schedule.ts`

**Issue:** Critical tax calculation has no test cases. Edge cases untested:
- Zero kilometres
- Ratio > 100% (mixed split logic)
- Very large allowances
- Invalid input (NaN, negative numbers)

**Current test coverage:** Inferred to be minimal or absent.

**Impact:** Breaking changes in travel logic silently propagate to all assessments.

**Fix approach:**
1. Add test cases for each method (ratio, deemed, actual)
2. Test edge cases: 0 km, 100% business, partial month
3. Verify against SARS ITR12 Schedule 3 examples
4. Test integration with calculation-service

---

### 16. No E2E Tests for Tax Calculation Workflows

**Files:** Test setup inferred from README.md (Playwright smoke tests referenced but minimal coverage)

**Issue:** No E2E tests that verify:
- User imports CSV → calculates tax → exports PDF
- Travel logbook round-trip (create → save → reload → verify)
- Multi-tab workflows (fill travel → medical → cgt → final assessment)

**Impact:** Regression not caught until user reports it.

**Fix approach:** Create E2E suite:
```typescript
// E2E: Travel logbook workflow
// 1. Upload CSV with 10 trips
// 2. Classify as Business
// 3. Verify dashboard shows correct km
// 4. Save assessment
// 5. Reload and verify data persisted
```

---

## Scaling Limits

### 17. Storage/Uploads Directory Growing Unchecked

**Files:** `src/modules/documents/storage-provider.ts`

**Issue:** No cleanup of old uploads. Over time, `/storage/uploads/` accumulates PDFs, DOCXs, ZIPs.

**Current state:** Manual cleanup required. No retention policy.

**Impact:**
- Disk space fills up (currently 3MB, but could grow to GBs)
- Slow file listing/backups
- No audit trail of what was deleted and why

**Current directory (showing accumulated test data):**
- 20+ files, oldest from March 9, latest from March 19
- No cleanup mechanism visible

**Fix approach:**
1. Implement retention policy: delete uploads older than 90 days
2. Background job to clean up on schedule
3. Log deletions for audit trail
4. Configurable TTL via `UPLOAD_RETENTION_DAYS` env var

---

### 18. Demo Mode Not Suitable for Concurrent Users

**Files:** `src/modules/*/repository.ts` (all demo implementations)

**Issue:** JSON file-based storage uses synchronous writes without locking. Two simultaneous users:
1. User A loads `demo-estates.json`, modifies, writes
2. User B loads `demo-estates.json`, modifies, writes (simultaneously)
3. One user's changes overwrite the other's

**Example scenario:**
- User A adds estate #1, User B adds estate #2
- Both call `writeDemoAssessmentsToDisk()` at same millisecond
- Last write wins; one estate is lost

**Impact:** Data corruption in multi-user scenarios. Fine for single-user local testing but breaks in shared environments.

**Fix approach:**
1. Document: "Demo mode is single-user only. Use Prisma + PostgreSQL for multi-user."
2. Add warning in UI if `DEMO_MODE=true` and `NODE_ENV=production`
3. Implement SQLite-in-memory for demo mode (allows concurrent access)

---

## Missing Critical Features

### 19. No Audit Trail for Tax Calculations

**Files:** Entire individual-tax module

**Issue:** Once an assessment is finalized, no record of:
- What calculation method was used
- Who approved it
- What assumptions were made
- When it was changed

**Impact:** Cannot defend against SARS audits. No accountability trail.

**Fix approach:**
1. Add assessment audit log: each version, timestamp, actor, changes
2. Track calculation rule pack version (e.g., "2026-tax-rules-v1.2")
3. Lock completed assessments from editing (archive → new version)

---

### 20. No Variance Analysis (Estimate vs Actual)

**Files:** Individual-tax module

**Issue:** Users estimate quarterly provisional tax but no workflow to reconcile against actual year-end amounts.

**Impact:** Cannot track if estimates were accurate, no learning loop.

**Severity:** MEDIUM - Useful feature but not blocking.

---

## Recommendations by Priority

### Immediate (HIGH - Do Before Release)
1. **Add trip data persistence** (#4) - Currently loses data on refresh
2. **Split tax-tools component** (#1) - 2,148 lines is unmaintainable
3. **Add error handling to TaxTools** (#7) - Silent failures are dangerous

### Short-term (MEDIUM - Next Phase)
4. **Replace naive CSV parser** (#2) - Current parser breaks on real data
5. **Implement proper travel deduction methods** (#5) - SARS compliance gap
6. **Add trip-level encryption/audit log** (#19) - Audit trail for tax claims
7. **Fix weak ID generation** (#6) - Collision risk, though low probability

### Medium-term (LOW - Technical Debt)
8. **Extract large components** (#11) - Maintainability issue
9. **Add integration tests** (#13) - Coverage gap between modules
10. **Implement upload cleanup** (#17) - Operational hygiene

### Documentation
- Add demo-mode disclaimer to README
- Specify SARS compliance limitations (review required, not auto-filing)
- Travel deduction methodology notes (crude estimate vs actual)

---

*Concerns audit: 2026-07-02*
