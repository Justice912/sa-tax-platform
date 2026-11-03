/**
 * Liquidation & Distribution (L&D) account engine types.
 *
 * Format follows Regulation 5 of Schedule 4 to the Administration of Estates
 * Act 66 of 1965 as taught in the practice's course material:
 *   Liquidation Account   A Immovable / B Movable  |  C Admin costs, D Fees, E Advances, F Claims
 *   Recapitulation statement (reg 5(1)(d))
 *   Income & Expenditure account (reg 5(1)(f))
 *   Distribution account (reg 5(1)(e))
 * Insolvent estates (s34) use encumbered-asset accounts + free residue and
 * the Insolvency Act order of preference.
 *
 * All outputs are drafts that require practitioner review before lodging.
 */

export type LdAdministrationType = "SOLVENT" | "INSOLVENT_S34" | "SMALL_ESTATE_S18_3";

export type LdAccountKind =
  | "FIRST_AND_FINAL"
  | "FIRST_INTERIM"
  | "SUPPLEMENTARY"
  | "AMENDED_FIRST_AND_FINAL";

export type LdMaritalRegime =
  | "NEVER_MARRIED"
  | "WIDOWED"
  | "DIVORCED"
  | "IN_COMMUNITY"
  | "OUT_OF_COMMUNITY_NO_ACCRUAL"
  | "OUT_OF_COMMUNITY_ACCRUAL"
  | "CUSTOMARY"
  | "UNKNOWN";

export interface LdHeadingInput {
  accountKind: LdAccountKind;
  testate: boolean;
  deceasedName: string;
  idNumber?: string;
  dateOfBirth?: string;
  dateOfDeath: string;
  residentialAddress?: string;
  maritalRegime: LdMaritalRegime;
  /** Required when married in community (reg 5(1)(a)(vi)). */
  spouseName?: string;
  spouseIdNumber?: string;
  /** reg 5(1)(a)(vii) massed estate where adiation took place. */
  massedWith?: string;
  masterReference?: string;
}

export interface LdAssetInput {
  id: string;
  section: "IMMOVABLE" | "MOVABLE";
  description: string;
  /** Value at date of death (valuation) or realised selling price. */
  value: number;
  voucher?: string;
  /** Cash or cash-equivalent (bank balances, refunds, policy proceeds paid to estate). */
  isCash?: boolean;
  /** How the executor deals with the asset (divestment note). */
  disposal?: "AWARD" | "SELL" | "CASH";
  /** Proceeds when sold (defaults to value). */
  realisedValue?: number;
  /** Beneficiary that receives the asset in specie. */
  awardedToBeneficiaryId?: string;
  /** Insolvent estates: general-cost apportionment basis override. */
  apportionmentBasis?: number;
}

export interface LdCostInput {
  id?: string;
  description: string;
  amount: number;
  voucher?: string;
  /** C = administration cost, E = advance (costs paid after first account / disbursements). */
  group: "ADMIN" | "ADVANCE";
  /** Insolvent: cost relates to one encumbered asset only; otherwise apportioned. */
  assetId?: string;
  /** Insolvent: whether the cost is apportioned across all accounts (stationery, bond of security, master's fee, bank charges). */
  apportion?: boolean;
}

export type LdClaimClass = "SECURED" | "PREFERENT" | "CONCURRENT";

export interface LdClaimInput {
  id?: string;
  creditor: string;
  description?: string;
  amount: number;
  voucher?: string;
  claimClass?: LdClaimClass;
  /** Secured claims: asset that secures the claim (e.g. bond over erf). */
  securedAssetId?: string;
  /**
   * Preferent rank (lower = paid first). Suggested ranks following the
   * Insolvency Act 24 of 1936 ss96-102 — verify against the Act for each estate:
   * 1 funeral & death-bed (s96), 2 administration costs (s97), 3 execution costs (s98),
   * 4 employee claims (s98A), 5 statutory (s99), 6 SARS taxes (s101), 7 general bond (s102).
   */
  preferenceRank?: number;
}

export interface LdBeneficiaryInput {
  id: string;
  fullName: string;
  idNumber?: string;
  relationship: string;
  isMinor: boolean;
  dateOfBirth?: string;
  /** e.g. "not married", "married in community of property to J Smith". */
  maritalNote?: string;
  allocationType: "RESIDUARY" | "CASH_LEGACY" | "SPECIFIC_ASSET" | "INCOME_RIGHT" | "TRUST_ALLOCATION";
  /** Residue share in percent. */
  sharePercentage: number;
  cashLegacyAmount?: number;
  /** Clause of the will that grants the award, e.g. "paragraph 4". */
  willClause?: string;
  /** Award subject to condition in the will (reg 5(1)(e)(iii)). */
  subjectToCondition?: boolean;
  isSurvivingSpouse?: boolean;
}

export interface LdIncomeExpenseLine {
  description: string;
  amount: number;
  voucher?: string;
}

export interface LdRedistributionInput {
  agreementDate: string;
  /** Asset-to-heir assignments agreed by the heirs. */
  assignments: Array<{ assetId: string; beneficiaryId: string }>;
}

export interface LdEstateDutyInput {
  /** Deemed property (s3(3)) e.g. policies paid directly to third parties. */
  deemedProperty: Array<{
    description: string;
    amount: number;
    category?: "DONATION_MORTIS_CAUSA" | "INSURANCE_POLICY" | "REVOCABLE_DISPOSITION" | "FIDUCIARY_INTEREST" | "OTHER_DEEMED";
  }>;
  /** s4(h) bequests to PBOs. */
  section4hDeductions?: number;
  /** s4(q) spouse deduction override; defaults to awards to surviving spouse. */
  spouseDeductionOverride?: number;
  /** Portion of s4A rebate (R3.5m) available (incl. ported unused spouse rebate). */
  abatement?: number;
  /** Rate bands; default 20% up to R30m, 25% above (dates of death from 1 March 2018). */
  rateBands?: Array<{ upTo: number | null; rate: number }>;
  /** Add the computed duty as a claim in section F. Default true. */
  includeAsClaim?: boolean;
}

export interface LdFeeOptions {
  /** Override Master's fee (e.g. if the Master assessed a different amount). */
  masterFeeOverride?: number;
  /** Override executor fee on assets, e.g. "as agreed". */
  executorFeeOverride?: number;
  executorFeeRateOnAssets?: number; // default 0.035
  executorFeeRateOnIncome?: number; // default 0.06
  /** VAT on executor fees if the executor is a VAT vendor. */
  executorVatRate?: number; // default 0 (AME not VAT registered)
  /** Policies payable directly to beneficiaries are excluded from the fee base (course notes). */
}

export interface LdInput {
  administrationType: LdAdministrationType;
  heading: LdHeadingInput;
  assets: LdAssetInput[];
  costs: LdCostInput[];
  claims: LdClaimInput[];
  beneficiaries: LdBeneficiaryInput[];
  income: LdIncomeExpenseLine[];
  expenses: LdIncomeExpenseLine[];
  incomePeriod?: { from: string; to: string };
  redistribution?: LdRedistributionInput;
  estateDuty?: LdEstateDutyInput;
  /** CGT on death (ITR12 to date of death), added as a claim. */
  capitalGainsTaxOnDeath?: number;
  /** Other SARS assessed liabilities to date of death (income tax etc.). */
  fees?: LdFeeOptions;
  lettersOfExecutorshipDate?: string;
}

export interface LdLine {
  no: string;
  description: string;
  voucher?: string;
  amount: number;
}

export interface LdSection {
  code: string;
  title: string;
  lines: LdLine[];
  total: number;
}

export type LdCheckLevel = "error" | "warning" | "info";

export interface LdCheck {
  code: string;
  level: LdCheckLevel;
  message: string;
}

export interface LdAward {
  beneficiaryId?: string;
  beneficiaryName: string;
  descriptor: string;
  basis: string;
  items: Array<{ description: string; amount: number }>;
  total: number;
}

export interface LdSolventResult {
  kind: "SOLVENT";
  administrationType: LdAdministrationType;
  heading: string;
  masterReferenceLine: string;
  assetSections: LdSection[];
  totalAssets: number;
  liabilitySections: LdSection[];
  totalLiabilities: number;
  balanceForDistribution: number;
  fees: {
    masterFee: number;
    executorFeeOnAssets: number;
    executorFeeOnIncome: number;
    executorVat: number;
    executorFeeBase: number;
  };
  recapitulation: {
    cashAndRealised: number;
    liabilities: number;
    cashLegacies: number;
    cashAvailable: number;
    deficiencyNote?: string;
  };
  incomeAndExpenditure: {
    period?: { from: string; to: string };
    income: LdLine[];
    expenditure: LdLine[];
    totalIncome: number;
    totalExpenditure: number;
    balance: number;
    balanceNote: string;
  };
  distribution: {
    balanceForDistribution: number;
    awards: LdAward[];
    totalAwarded: number;
    difference: number;
  };
  estateDuty?: {
    propertyPerLiquidationAccount: number;
    deemedProperty: number;
    grossValue: number;
    section4Deductions: number;
    spouseDeduction: number;
    section4hDeductions: number;
    netValue: number;
    abatement: number;
    dutiableAmount: number;
    dutyPayable: number;
  };
  deadlines: Array<{ code: string; label: string; dueDate: string }>;
  checks: LdCheck[];
}

export interface LdInsolventAccount {
  code: string;
  title: string;
  receipts: LdLine[];
  payments: LdLine[];
  totalReceipts: number;
  totalPayments: number;
  balance: number;
  securedCreditor?: { creditor: string; claim: number; award: number; shortfall: number };
}

export interface LdApportionmentRow {
  cost: string;
  totalAmount: number;
  shares: Array<{ account: string; basis: number; amount: number }>;
}

export interface LdCreditorAward {
  creditor: string;
  claimClass: LdClaimClass;
  claim: number;
  award: number;
  deficit: number;
  voucher?: string;
}

export interface LdInsolventResult {
  kind: "INSOLVENT_S34";
  administrationType: "INSOLVENT_S34";
  heading: string;
  masterReferenceLine: string;
  accounts: LdInsolventAccount[];
  incomeAndExpenditure: LdSolventResult["incomeAndExpenditure"];
  apportionments: LdApportionmentRow[];
  freeResidueAvailable: number;
  concurrentDividendRate: number;
  creditorAwards: LdCreditorAward[];
  fees: LdSolventResult["fees"];
  deadlines: Array<{ code: string; label: string; dueDate: string }>;
  checks: LdCheck[];
}

export type LdResult = LdSolventResult | LdInsolventResult;
