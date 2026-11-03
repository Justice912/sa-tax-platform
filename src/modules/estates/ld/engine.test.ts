import { describe, expect, it } from "vitest";
import { buildLdAccount } from "@/modules/estates/ld/engine";
import { calculateMastersFee } from "@/modules/estates/ld/fees";
import type { LdInput, LdInsolventResult, LdSolventResult } from "@/modules/estates/ld/types";

const baseHeading: LdInput["heading"] = {
  accountKind: "FIRST_AND_FINAL",
  testate: true,
  deceasedName: "J K Surname",
  idNumber: "5102025000000",
  dateOfBirth: "1951-02-02",
  dateOfDeath: "2024-10-13",
  residentialAddress: "1 Main Road, Bellville",
  maritalRegime: "NEVER_MARRIED",
  masterReference: "5412/2024",
};

describe("Master's fee tariff (course notes)", () => {
  it.each([
    [249_999, 0],
    [250_000, 600],
    [400_000, 600],
    [499_999, 600],
    [500_000, 800],
    [1_000_000, 1_800],
    [3_600_000, 7_000],
    [12_000_000, 7_000],
  ])("gross %d -> R%d", (gross, fee) => {
    expect(calculateMastersFee(gross)).toBe(fee);
  });

  it("section 18(3) estates pay no Master's fee", () => {
    expect(calculateMastersFee(240_000, { isSection18_3: true })).toBe(0);
  });
});

describe("solvent L&D account", () => {
  const input: LdInput = {
    administrationType: "SOLVENT",
    heading: baseHeading,
    lettersOfExecutorshipDate: "2024-12-01",
    assets: [
      { id: "erf", section: "IMMOVABLE", description: "Erf 1234, Bellville", value: 5_123_000, voucher: "1", awardedToBeneficiaryId: "daughter" },
      { id: "audi", section: "MOVABLE", description: "2005 Audi A3", value: 125_000, voucher: "3", awardedToBeneficiaryId: "daughter" },
      { id: "absa", section: "MOVABLE", description: "Absa cheque account", value: 2_741_000, voucher: "4", isCash: true },
    ],
    costs: [
      { description: "Advertisement for debtors and creditors", amount: 579.5, voucher: "8", group: "ADMIN" },
      { description: "Funeral costs", amount: 20_000, voucher: "9", group: "ADMIN" },
      { description: "Advertisement for this account", amount: 664.56, voucher: "12", group: "ADVANCE" },
    ],
    claims: [{ creditor: "First National Bank", description: "Home loan", amount: 232_722.21, voucher: "18" }],
    beneficiaries: [
      { id: "daughter", fullName: "Lize Muller", relationship: "Daughter", isMinor: false, maritalNote: "not married", allocationType: "SPECIFIC_ASSET", sharePercentage: 0, willClause: "paragraph 4" },
      { id: "son1", fullName: "A Surname", relationship: "Son", isMinor: false, allocationType: "RESIDUARY", sharePercentage: 50 },
      { id: "son2", fullName: "B Surname", relationship: "Son", isMinor: false, allocationType: "RESIDUARY", sharePercentage: 50 },
    ],
    income: [{ description: "Interest on cheque account", amount: 1_000 }],
    expenses: [{ description: "Bank charges", amount: 1_783.98 }],
    fees: { executorFeeOverride: 55_000 },
  };

  it("builds the Reg 5 sections, balances and distributes the residue", () => {
    const r = buildLdAccount(input) as LdSolventResult;
    expect(r.kind).toBe("SOLVENT");
    expect(r.heading).toContain("First and Final Liquidation and Distribution Account in the testate estate of the late J K Surname");
    expect(r.heading).toContain("who was never married");
    expect(r.totalAssets).toBe(7_989_000);
    expect(r.fees.masterFee).toBe(7_000);
    expect(r.liabilitySections.map((s) => s.code)).toEqual(["C", "D", "E", "F"]);
    expect(r.totalLiabilities).toBe(20_579.5 + 62_000 + 664.56 + 232_722.21);
    expect(r.distribution.difference).toBe(0);
    const residue = r.distribution.awards.filter((a) => a.items.some((i) => i.description.startsWith("Residue")));
    expect(residue).toHaveLength(2);
    expect(residue[0].total + residue[1].total).toBeCloseTo(r.balanceForDistribution - 5_248_000, 2);
    expect(r.incomeAndExpenditure.expenditure[0].amount).toBe(60);
    expect(r.incomeAndExpenditure.balance).toBe(-843.98);
    expect(r.deadlines.find((d) => d.code === "LD_LODGE")?.dueDate).toBe("2025-06-01");
    expect(r.checks.filter((c) => c.level === "error")).toEqual([]);
  });

  it("applies a redistribution agreement to awards", () => {
    const r = buildLdAccount({
      ...input,
      redistribution: { agreementDate: "2025-02-01", assignments: [{ assetId: "erf", beneficiaryId: "son1" }] },
    }) as LdSolventResult;
    const son1 = r.distribution.awards.find((a) => a.beneficiaryId === "son1" && a.basis.includes("Redistribution"));
    expect(son1?.items[0].amount).toBe(5_123_000);
    expect(r.distribution.difference).toBe(0);
    expect(r.checks.some((c) => c.code === "REDISTRIBUTION_AGREEMENT")).toBe(true);
  });
});

describe("estate duty — course worked example (Lize Muller)", () => {
  it("R8 634 000 gross, R584 249.18 deductions, R3.5m rebate -> R909 950.16 duty", () => {
    const r = buildLdAccount({
      administrationType: "SOLVENT",
      heading: baseHeading,
      assets: [{ id: "a", section: "MOVABLE", description: "Assets per liquidation account", value: 7_989_000, voucher: "1", isCash: true }],
      costs: [],
      claims: [{ creditor: "Various", amount: 497_249.18, voucher: "2" }],
      beneficiaries: [{ id: "h", fullName: "Heir", relationship: "Son", isMinor: false, allocationType: "RESIDUARY", sharePercentage: 100 }],
      income: [],
      expenses: [],
      fees: { masterFeeOverride: 7_000, executorFeeOverride: 55_000 },
      estateDuty: {
        deemedProperty: [
          { description: "Liberty Life paid to HE Helen", amount: 520_000, category: "INSURANCE_POLICY" },
          { description: "Policies paid to third parties", amount: 125_000, category: "INSURANCE_POLICY" },
        ],
        section4hDeductions: 25_000,
      },
    }) as LdSolventResult;
    expect(r.estateDuty?.grossValue).toBe(8_634_000);
    expect(r.estateDuty?.dutiableAmount).toBe(4_549_750.82);
    expect(r.estateDuty?.dutyPayable).toBe(909_950.16);
    expect(r.liabilitySections[3].lines.at(-1)).toMatchObject({ description: "SARS: Estate duty", amount: 909_950.16 });
  });

  it("surviving spouse as sole heir removes the duty via s4(q)", () => {
    const r = buildLdAccount({
      administrationType: "SOLVENT",
      heading: { ...baseHeading, maritalRegime: "OUT_OF_COMMUNITY_ACCRUAL" },
      assets: [{ id: "a", section: "MOVABLE", description: "Investments", value: 10_000_000, voucher: "1", isCash: true }],
      costs: [],
      claims: [],
      beneficiaries: [{ id: "s", fullName: "Spouse", relationship: "Spouse", isMinor: false, isSurvivingSpouse: true, allocationType: "RESIDUARY", sharePercentage: 100 }],
      income: [],
      expenses: [],
      estateDuty: { deemedProperty: [] },
    }) as LdSolventResult;
    expect(r.estateDuty?.dutyPayable).toBe(0);
  });
});

describe("in community of property", () => {
  it("awards the surviving spouse half of the joint estate", () => {
    const r = buildLdAccount({
      administrationType: "SOLVENT",
      heading: { ...baseHeading, maritalRegime: "IN_COMMUNITY", spouseName: "M Surname" },
      assets: [{ id: "h", section: "IMMOVABLE", description: "Erf 1", value: 2_000_000, voucher: "1", disposal: "SELL" }],
      costs: [{ description: "Advertisements", amount: 1_000, voucher: "2", group: "ADMIN" }],
      claims: [{ creditor: "Bank", amount: 200_000, voucher: "3" }],
      beneficiaries: [
        { id: "sp", fullName: "M Surname", relationship: "Spouse", isMinor: false, isSurvivingSpouse: true, allocationType: "SPECIFIC_ASSET", sharePercentage: 0 },
        { id: "c", fullName: "Child", relationship: "Daughter", isMinor: true, dateOfBirth: "2012-01-01", allocationType: "RESIDUARY", sharePercentage: 100 },
      ],
      income: [],
      expenses: [],
    }) as LdSolventResult;
    const spouse = r.distribution.awards.find((a) => a.beneficiaryId === "sp");
    expect(spouse?.total).toBe(900_000);
    expect(r.heading).toContain("married in community of property to M Surname");
    expect(r.distribution.difference).toBe(0);
  });
});

describe("section 18(3)", () => {
  it("flags estates at or above R250 000", () => {
    const r = buildLdAccount({
      administrationType: "SMALL_ESTATE_S18_3",
      heading: baseHeading,
      assets: [{ id: "a", section: "MOVABLE", description: "Bank", value: 260_000, voucher: "1", isCash: true }],
      costs: [],
      claims: [],
      beneficiaries: [{ id: "h", fullName: "Heir", relationship: "Son", isMinor: false, allocationType: "RESIDUARY", sharePercentage: 100 }],
      income: [],
      expenses: [],
    }) as LdSolventResult;
    expect(r.fees.masterFee).toBe(0);
    expect(r.checks.some((c) => c.code === "S18_3_THRESHOLD" && c.level === "error")).toBe(true);
    expect(r.heading).toContain("section 18(3)");
  });
});

describe("insolvent estate — section 34 (course Annexures G–I)", () => {
  it("apportions general costs by value (Annexure H)", () => {
    const r = buildLdAccount({
      administrationType: "INSOLVENT_S34",
      heading: { ...baseHeading, testate: false, maritalRegime: "OUT_OF_COMMUNITY_NO_ACCRUAL" },
      assets: [
        { id: "erf", section: "IMMOVABLE", description: "Undivided share in immovable property", value: 737_500, voucher: "1" },
        { id: "boat", section: "MOVABLE", description: "Proceeds of sale of Supercat boat", value: 25_000, voucher: "2" },
      ],
      costs: [
        { description: "Stationery and postage", amount: 250, group: "ADMIN", apportion: true },
        { description: "Bond cancellation", amount: 2_000, group: "ADMIN", assetId: "erf" },
      ],
      claims: [{ creditor: "Bank", description: "Outstanding bond", amount: 900_000, claimClass: "SECURED", securedAssetId: "erf", voucher: "9" }],
      beneficiaries: [],
      income: [],
      expenses: [],
      fees: { masterFeeOverride: 0 },
    }) as LdInsolventResult;
    const stationery = r.apportionments.find((a) => a.cost === "Stationery and postage")!;
    expect(stationery.shares.map((s) => s.amount)).toEqual([241.8, 8.2]);
    expect(r.accounts[0].title).toContain("Encumbered Asset");
    expect(r.accounts[0].securedCreditor?.shortfall).toBeGreaterThan(0);
    expect(r.creditorAwards.some((c) => c.creditor.includes("balance of secured claim"))).toBe(true);
    expect(r.heading).toContain("section 34");
  });

  it("pays concurrent creditors pro rata (Annexure I)", () => {
    const claims = [3_404.6, 97_571.76, 34_622.28, 12_326.57, 5_264.14, 112_341.55, 50_903.23, 21_049.59, 190_961.6];
    const r = buildLdAccount({
      administrationType: "INSOLVENT_S34",
      heading: baseHeading,
      assets: [{ id: "cash", section: "MOVABLE", description: "Cash available", value: 2_561.08, voucher: "1" }],
      costs: [],
      claims: claims.map((amount, i) => ({ creditor: `Creditor ${i + 1}`, amount, claimClass: "CONCURRENT" as const, voucher: String(i + 1) })),
      beneficiaries: [],
      income: [],
      expenses: [],
      fees: { masterFeeOverride: 0, executorFeeOverride: 0 },
    }) as LdInsolventResult;
    const awards = r.creditorAwards.map((c) => c.award);
    expect(awards[0]).toBe(16.5);
    expect(awards[1]).toBe(472.88);
    // Course shows R544.45 (manual rounding); half-up rounding gives R544.46 and the
    // total still ties exactly to the R2 561.08 available, as in the course example.
    expect(awards[5]).toBe(544.46);
    expect(Math.round(awards.reduce((t, a) => t + a, 0) * 100) / 100).toBe(2_561.08);
    expect(awards[8]).toBe(925.48);
    expect(r.creditorAwards[0].deficit).toBe(3_388.1);
  });

  it("ranks preferent creditors ahead of concurrent creditors", () => {
    const r = buildLdAccount({
      administrationType: "INSOLVENT_S34",
      heading: baseHeading,
      assets: [{ id: "cash", section: "MOVABLE", description: "Cash", value: 10_000, voucher: "1" }],
      costs: [],
      claims: [
        { creditor: "SARS", amount: 6_000, claimClass: "PREFERENT", preferenceRank: 6, voucher: "1" },
        { creditor: "Funeral parlour", amount: 3_000, claimClass: "PREFERENT", preferenceRank: 1, voucher: "2" },
        { creditor: "Store card", amount: 5_000, claimClass: "CONCURRENT", voucher: "3" },
      ],
      beneficiaries: [],
      income: [],
      expenses: [],
      fees: { masterFeeOverride: 0, executorFeeOverride: 0 },
    }) as LdInsolventResult;
    const byName = Object.fromEntries(r.creditorAwards.map((c) => [c.creditor, c.award]));
    expect(byName["Funeral parlour"]).toBe(3_000);
    expect(byName["SARS"]).toBe(6_000);
    expect(byName["Store card"]).toBe(1_000);
  });
});
