export type LogbookCostMethod = "DEEMED" | "ACTUAL";

export interface VehicleDetails {
  id: string;
  make: string;
  model: string;
  registrationNumber: string;
  /** Purchase/cost price in rand, incl. VAT, excl. finance charges (SARS s8(1)(b) valuation basis). */
  costPrice: number;
  /** Optional ISO date (YYYY-MM-DD). */
  acquisitionDate?: string | null;
}

export interface LogbookTripRecord {
  id: string;
  /** ISO date YYYY-MM-DD. */
  date: string;
  businessKm: number;
  fromLocation: string;
  toLocation: string;
  reason: string;
  /** Per-trip odometer readings are OPTIONAL per the official SARS eLogbook ("not compulsory"). */
  odometerStart?: number | null;
  odometerEnd?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActualCostExpenses {
  fuel: number;
  maintenance: number;
  insurance: number;
  licence: number;
  financeCharges: number;
}

export interface LogbookRecord {
  id: string;
  clientId: string;
  /** SARS year of assessment (2025–2027 this milestone). Set at creation; never re-derived from trip dates. */
  assessmentYear: number;
  vehicle: VehicleDetails;
  openingOdometer: number;
  closingOdometer: number | null;
  /** Elected once per logbook (per vehicle per tax year) — NEVER per trip (Pitfall 1). */
  costMethod: LogbookCostMethod;
  /** May be captured regardless of elected method — needed for the LOG-05 side-by-side comparison.
      The elected costMethod alone decides the claim; presence of expenses never overrides it. */
  actualExpenses: ActualCostExpenses | null;
  trips: LogbookTripRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface LogbookWarning {
  code: string;
  message: string;
}

/** The decoupled output seam Phase 3 (ITR12 travel schedule) will consume. */
export interface LogbookTravelResult {
  totalKilometres: number | null; // closing - opening; null when closing odometer not yet recorded
  businessKilometres: number;
  costMethod: LogbookCostMethod;
  deemedCostDeduction: number;
  actualCostDeduction: number | null; // null if actual-cost inputs incomplete
  /** Resolved SOLELY via costMethod — never a data-presence fallback chain. */
  claimedDeduction: number;
  recommendedMethod: LogbookCostMethod; // whichever yields the higher deduction (of the computable ones)
  warnings: LogbookWarning[];
}

/** Data shape for the SARS-audit printable summary (rendered by Phase 6 UI; data-only here per LOG-06). */
export interface LogbookAuditSummary {
  clientId: string;
  assessmentYear: number;
  vehicle: VehicleDetails;
  openingOdometer: number;
  closingOdometer: number | null;
  totalKilometres: number | null;
  totalBusinessKm: number;
  tripCount: number;
  trips: LogbookTripRecord[];
  travelResult: LogbookTravelResult;
  generatedAt: string;
}
