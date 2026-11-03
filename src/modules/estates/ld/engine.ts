import { calculateEstateDuty } from "@/modules/estates/engines/estate-duty/calculation";
import {
  addDays,
  addMonths,
  calculateExecutorFee,
  calculateMastersFee,
  roundCurrency,
  SECTION_18_3_THRESHOLD,
} from "@/modules/estates/ld/fees";
import type {
  LdAward,
  LdBeneficiaryInput,
  LdCheck,
  LdCostInput,
  LdCreditorAward,
  LdInput,
  LdInsolventAccount,
  LdInsolventResult,
  LdLine,
  LdResult,
  LdSection,
  LdSolventResult,
} from "@/modules/estates/ld/types";

const DEFAULT_RATE_BANDS = [
  { upTo: 30_000_000, rate: 0.2 },
  { upTo: null, rate: 0.25 },
];
const DEFAULT_ABATEMENT = 3_500_000;

const sum = (values: number[]) => roundCurrency(values.reduce((t, v) => t + v, 0));

const ACCOUNT_LABELS: Record<LdInput["heading"]["accountKind"], string> = {
  FIRST_AND_FINAL: "First and Final",
  FIRST_INTERIM: "First Interim",
  SUPPLEMENTARY: "Supplementary",
  AMENDED_FIRST_AND_FINAL: "Amended First and Final",
};

function maritalPhrase(heading: LdInput["heading"]) {
  switch (heading.maritalRegime) {
    case "NEVER_MARRIED":
      return "who was never married";
    case "WIDOWED":
      return "who was widowed";
    case "DIVORCED":
      return "who was divorced";
    case "IN_COMMUNITY":
      return `who was married in community of property to ${heading.spouseName ?? "[SPOUSE NAME]"}${
        heading.spouseIdNumber ? `, with identity number ${heading.spouseIdNumber}` : ""
      }`;
    case "OUT_OF_COMMUNITY_NO_ACCRUAL":
      return "who was married out of community of property with exclusion of the accrual system";
    case "OUT_OF_COMMUNITY_ACCRUAL":
      return "who was married out of community of property subject to the accrual system in terms of section 2 of the Matrimonial Property Act 88 of 1984";
    case "CUSTOMARY":
      return "who was married in terms of customary law";
    default:
      return "whose marital status is [TO BE CONFIRMED]";
  }
}

export function buildHeading(input: LdInput) {
  const h = input.heading;
  const parts = [
    `In the ${ACCOUNT_LABELS[h.accountKind]} Liquidation and Distribution Account in the ${
      h.testate ? "testate" : "intestate"
    } ${h.massedWith ? `massed estate of the late ${h.deceasedName} and ${h.massedWith}` : `estate of the late ${h.deceasedName}`}`,
    h.idNumber ? `with identity number ${h.idNumber}` : undefined,
    h.dateOfBirth ? `born on ${h.dateOfBirth}` : undefined,
    maritalPhrase(h),
    `who resided at ${h.residentialAddress ?? "[RESIDENTIAL ADDRESS]"}`,
    `and who died on ${h.dateOfDeath}`,
  ].filter(Boolean);
  let text = parts.join(", ").replace(", and who died", " and who died");
  if (input.administrationType === "INSOLVENT_S34") {
    text += ", which estate is being administered in terms of section 34 of the Administration of Estates Act 66 of 1965";
  } else if (input.administrationType === "SMALL_ESTATE_S18_3") {
    text += ", which estate is being administered in terms of section 18(3) of the Administration of Estates Act 66 of 1965";
  }
  return {
    heading: `${text}.`,
    masterReferenceLine: `MASTER'S REFERENCE NUMBER: ${h.masterReference ?? "[TO BE ALLOCATED]"}`,
  };
}

function assetAmount(asset: LdInput["assets"][number]) {
  return roundCurrency(asset.disposal === "SELL" ? asset.realisedValue ?? asset.value : asset.value);
}

function assetLineDescription(asset: LdInput["assets"][number]) {
  if (asset.disposal === "AWARD" || asset.awardedToBeneficiaryId) {
    return `${asset.description} (awarded as set out in the Distribution Account)`;
  }
  if (asset.disposal === "SELL") return `${asset.description} (sold; proceeds reflected)`;
  return asset.description;
}

function descriptor(b: LdBeneficiaryInput) {
  if (b.isSurvivingSpouse) return `surviving spouse of the deceased${b.idNumber ? `, with identity number ${b.idNumber}` : ""}`;
  const parts = [`${b.isMinor ? "minor" : "major"} ${b.relationship.toLowerCase()} of the deceased`];
  if (b.isMinor && b.dateOfBirth) parts.push(`born on ${b.dateOfBirth}`);
  if (b.idNumber) parts.push(`with identity number ${b.idNumber}`);
  if (b.maritalNote) parts.push(`who is ${b.maritalNote}`);
  return parts.join(", ");
}

function basisFor(b: LdBeneficiaryInput, testate: boolean) {
  const base = testate
    ? `in terms of ${b.willClause ? `${b.willClause} of ` : ""}the deceased's Last Will and Testament`
    : "in terms of the Intestate Succession Act 81 of 1987";
  return b.subjectToCondition ? `${base}, subject to and in terms of the condition(s) contained therein` : base;
}

function incomeAndExpenditure(input: LdInput, rateOnIncome: number, vatRate: number) {
  const totalIncome = sum(input.income.map((l) => l.amount));
  const fee = roundCurrency(totalIncome * rateOnIncome);
  const vat = roundCurrency(fee * vatRate);
  const income: LdLine[] = input.income.map((l, i) => ({ no: String(i + 1), description: l.description, voucher: l.voucher, amount: roundCurrency(l.amount) }));
  const expenditure: LdLine[] = [
    { no: "1", description: `Executor's remuneration on income collected: ${(rateOnIncome * 100).toFixed(0)}% of R${totalIncome.toFixed(2)}`, amount: fee },
    ...(vat > 0 ? [{ no: "2", description: "VAT on executor's remuneration on income", amount: vat }] : []),
    ...input.expenses.map((l, i) => ({ no: String(i + (vat > 0 ? 3 : 2)), description: l.description, voucher: l.voucher, amount: roundCurrency(l.amount) })),
  ];
  const totalExpenditure = sum(expenditure.map((l) => l.amount));
  const balance = roundCurrency(totalIncome - totalExpenditure);
  const balanceNote =
    totalIncome === 0 && input.expenses.length === 0
      ? "No income was collected after the date of death."
      : balance >= 0
        ? "Balance available for distribution to the residuary heirs pro rata to their shares."
        : "Shortfall to be contributed by the heirs.";
  return { period: input.incomePeriod, income, expenditure, totalIncome, totalExpenditure, balance, balanceNote, executorFeeOnIncome: fee, vatOnIncome: vat };
}

function deadlines(input: LdInput) {
  const out: Array<{ code: string; label: string; dueDate: string }> = [
    { code: "REPORT_TO_MASTER", label: "Report estate to the Master (14 days after death)", dueDate: addDays(input.heading.dateOfDeath, 14) },
    { code: "ESTATE_DUTY_DUE", label: "Estate duty payable (12 months after death, unless assessment states otherwise) — s10 interest thereafter", dueDate: addMonths(input.heading.dateOfDeath, 12) },
  ];
  if (input.lettersOfExecutorshipDate) {
    out.push({ code: "LD_LODGE", label: "Lodge L&D account with the Master (s35(1): 6 months after letters)", dueDate: addMonths(input.lettersOfExecutorshipDate, 6) });
  }
  return out;
}

/* ------------------------------------------------------------------------ */
/* Solvent and section 18(3) estates                                         */
/* ------------------------------------------------------------------------ */

function buildSolvent(input: LdInput): LdSolventResult {
  const checks: LdCheck[] = [];
  const { heading, masterReferenceLine } = buildHeading(input);
  const inCommunity = input.heading.maritalRegime === "IN_COMMUNITY";
  const fees = input.fees ?? {};
  const vatRate = fees.executorVatRate ?? 0;
  const rateOnIncome = fees.executorFeeRateOnIncome ?? 0.06;

  // Assignments (redistribution overrides the will)
  const assignment = new Map<string, string>();
  for (const a of input.assets) if (a.awardedToBeneficiaryId) assignment.set(a.id, a.awardedToBeneficiaryId);
  for (const r of input.redistribution?.assignments ?? []) assignment.set(r.assetId, r.beneficiaryId);

  const assetSections: LdSection[] = (["IMMOVABLE", "MOVABLE"] as const).map((section, idx) => {
    const lines = input.assets
      .filter((a) => a.section === section)
      .map((a, i) => ({
        no: String(i + 1),
        description: assetLineDescription({ ...a, awardedToBeneficiaryId: assignment.get(a.id) }),
        voucher: a.voucher,
        amount: assetAmount(a),
      }));
    return { code: idx === 0 ? "A" : "B", title: section === "IMMOVABLE" ? "Immovable Property" : "Movable Property", lines, total: sum(lines.map((l) => l.amount)) };
  });
  const totalAssets = sum(assetSections.map((s) => s.total));

  const isS183 = input.administrationType === "SMALL_ESTATE_S18_3";
  const masterFee = fees.masterFeeOverride ?? calculateMastersFee(totalAssets, { isSection18_3: isS183 });
  const ie = incomeAndExpenditure(input, rateOnIncome, vatRate);
  const exec = calculateExecutorFee(totalAssets, ie.totalIncome, {
    rateOnAssets: fees.executorFeeRateOnAssets,
    rateOnIncome,
    vatRate,
    override: fees.executorFeeOverride,
  });

  const costLines = (group: LdCostInput["group"]) =>
    input.costs.filter((c) => c.group === group).map((c, i) => ({ no: String(i + 1), description: c.description, voucher: c.voucher, amount: roundCurrency(c.amount) }));

  const feeLines: LdLine[] = [
    { no: "1", description: isS183 ? "Master's fees (not payable: section 18(3) estate)" : "Master's fees", amount: masterFee },
    {
      no: "2",
      description:
        fees.executorFeeOverride !== undefined
          ? "Executor's fees (as agreed)"
          : `Executor's fees: ${((fees.executorFeeRateOnAssets ?? 0.035) * 100).toFixed(1)}% of R${totalAssets.toFixed(2)}`,
      amount: exec.onAssets,
    },
    ...(exec.vatOnAssets > 0 ? [{ no: "3", description: "VAT on executor's fees", amount: exec.vatOnAssets }] : []),
  ];

  const baseClaims: LdLine[] = input.claims.map((c, i) => ({
    no: String(i + 1),
    description: `${c.creditor}${c.description ? `: ${c.description}` : ""}`,
    voucher: c.voucher,
    amount: roundCurrency(c.amount),
  }));
  const cgt = roundCurrency(input.capitalGainsTaxOnDeath ?? 0);

  const sectionsWithoutDuty = (estateDuty: number): LdSection[] => {
    const claims = [...baseClaims];
    if (cgt > 0) claims.push({ no: String(claims.length + 1), description: "SARS: Capital gains tax on death (ITR12 to date of death)", amount: cgt });
    if (estateDuty > 0) claims.push({ no: String(claims.length + 1), description: "SARS: Estate duty", amount: estateDuty });
    const make = (code: string, title: string, lines: LdLine[]): LdSection => ({ code, title, lines, total: sum(lines.map((l) => l.amount)) });
    return [
      make("C", "Administration Costs", costLines("ADMIN")),
      make("D", "Fees", feeLines),
      make("E", "Advances", costLines("ADVANCE")),
      make("F", "Claims against the Estate", claims),
    ];
  };

  const beneficiaries = input.beneficiaries;
  const byId = new Map(beneficiaries.map((b) => [b.id, b]));
  const spouse = beneficiaries.find((b) => b.isSurvivingSpouse);
  const jointClaims = sum(input.claims.map((c) => c.amount));

  const distribute = (balance: number) => {
    const awards = new Map<string, LdAward>();
    const awardFor = (b: LdBeneficiaryInput, basis: string) => {
      const key = `${b.id}|${basis}`;
      if (!awards.has(key)) awards.set(key, { beneficiaryId: b.id, beneficiaryName: b.fullName, descriptor: descriptor(b), basis, items: [], total: 0 });
      return awards.get(key)!;
    };
    let allocated = 0;
    const redistributed = new Set((input.redistribution?.assignments ?? []).map((a) => a.assetId));
    let spouseSpecific = 0;
    for (const asset of input.assets) {
      const recipientId = assignment.get(asset.id);
      if (!recipientId) continue;
      const b = byId.get(recipientId);
      if (!b) {
        checks.push({ code: "UNKNOWN_AWARDEE", level: "error", message: `Asset "${asset.description}" is awarded to an unknown beneficiary.` });
        continue;
      }
      const basis = redistributed.has(asset.id)
        ? `in terms of the Redistribution Agreement dated ${input.redistribution!.agreementDate}`
        : basisFor(b, input.heading.testate);
      const award = awardFor(b, basis);
      award.items.push({ description: asset.description, amount: assetAmount(asset) });
      allocated += assetAmount(asset);
      if (b.isSurvivingSpouse) spouseSpecific += assetAmount(asset);
    }
    let spouseHalf = 0;
    if (inCommunity) {
      spouseHalf = roundCurrency((totalAssets - jointClaims) / 2);
      if (!spouse) {
        checks.push({ code: "SPOUSE_MISSING", level: "error", message: "Married in community of property but no beneficiary is flagged as the surviving spouse." });
      } else {
        const balanceOfHalf = roundCurrency(spouseHalf - spouseSpecific);
        if (balanceOfHalf > 0) {
          awardFor(spouse, "half share of the joint estate in terms of the marriage in community of property").items.push({
            description: "Half share of the joint estate (balance after assets awarded in specie)",
            amount: balanceOfHalf,
          });
          allocated += balanceOfHalf;
        }
      }
    }
    for (const b of beneficiaries.filter((x) => x.allocationType === "CASH_LEGACY" && (x.cashLegacyAmount ?? 0) > 0)) {
      awardFor(b, basisFor(b, input.heading.testate)).items.push({ description: "Cash legacy", amount: roundCurrency(b.cashLegacyAmount!) });
      allocated += b.cashLegacyAmount!;
    }
    const residue = roundCurrency(balance - allocated);
    const residuary = beneficiaries.filter((b) => b.allocationType === "RESIDUARY" && b.sharePercentage > 0);
    if (residue < -0.01) {
      checks.push({
        code: "RESIDUE_NEGATIVE",
        level: "error",
        message: `Specific awards and legacies exceed the balance for distribution by R${Math.abs(residue).toFixed(2)}. A cash contribution by the heirs, realisation of assets or a redistribution agreement is required.`,
      });
    } else if (residue > 0.01) {
      if (residuary.length === 0) {
        checks.push({ code: "NO_RESIDUARY_HEIRS", level: "error", message: `Residue of R${residue.toFixed(2)} has no residuary heir.` });
      } else {
        const shareTotal = residuary.reduce((t, b) => t + b.sharePercentage, 0);
        if (Math.abs(shareTotal - 100) > 0.01) {
          checks.push({ code: "RESIDUE_SHARES", level: "warning", message: `Residuary shares total ${shareTotal}% — normalised to 100%.` });
        }
        let given = 0;
        residuary.forEach((b, i) => {
          const amount = i === residuary.length - 1 ? roundCurrency(residue - given) : roundCurrency((residue * b.sharePercentage) / shareTotal);
          given = roundCurrency(given + amount);
          awardFor(b, basisFor(b, input.heading.testate)).items.push({
            description: `Residue (${((b.sharePercentage / shareTotal) * 100).toFixed(2).replace(/\.00$/, "")}% share)`,
            amount,
          });
        });
      }
    }
    const list = [...awards.values()].map((a) => ({ ...a, total: sum(a.items.map((i) => i.amount)) }));
    return { awards: list, spouseHalf, spouseAccrual: sum(list.filter((a) => byId.get(a.beneficiaryId!)?.isSurvivingSpouse).map((a) => a.total)) };
  };

  // Estate duty fixed-point iteration (duty reduces residue, which changes s4(q)).
  let estateDuty = 0;
  let edSummary: LdSolventResult["estateDuty"];
  const edInput = input.estateDuty;
  const includeDuty = edInput ? edInput.includeAsClaim !== false : false;
  let liabilitySections = sectionsWithoutDuty(0);
  for (let i = 0; i < 25; i += 1) {
    liabilitySections = sectionsWithoutDuty(includeDuty ? estateDuty : 0);
    const totalLiabilities = sum(liabilitySections.map((s) => s.total));
    const balance = roundCurrency(totalAssets - totalLiabilities);
    if (!edInput) break;
    const { spouseAccrual } = distribute(balance);
    checks.length = 0;
    const deductionsExDuty = roundCurrency(totalLiabilities - (includeDuty ? estateDuty : 0));
    const deemed = sum(edInput.deemedProperty.map((d) => d.amount));
    // In community: duty on the deceased's half of the joint estate.
    const property = inCommunity ? roundCurrency(totalAssets / 2) : totalAssets;
    const s4 = inCommunity ? roundCurrency(deductionsExDuty - jointClaims / 2) : deductionsExDuty;
    const spouseDeduction = edInput.spouseDeductionOverride ?? (inCommunity ? Math.max(0, roundCurrency(spouseAccrual - distribute(balance).spouseHalf)) : spouseAccrual);
    const result = calculateEstateDuty({
      grossEstateValue: property,
      deemedPropertyItems: edInput.deemedProperty
        .filter((d) => d.amount > 0)
        .map((d) => ({ category: d.category ?? "OTHER_DEEMED", description: d.description, amount: d.amount })),
      liabilities: Math.max(0, s4),
      section4Deductions: edInput.section4hDeductions ?? 0,
      spouseDeduction: Math.max(0, spouseDeduction),
      estateDutyAbatement: edInput.abatement ?? DEFAULT_ABATEMENT,
      estateDutyRateBands: (edInput.rateBands ?? DEFAULT_RATE_BANDS).map((b) => ({ upTo: b.upTo, rate: b.rate })),
    } as Parameters<typeof calculateEstateDuty>[0]);
    const s = result.summary;
    edSummary = {
      propertyPerLiquidationAccount: property,
      deemedProperty: deemed,
      grossValue: s.grossEstateValue,
      section4Deductions: s.liabilities,
      spouseDeduction: s.spouseDeduction,
      section4hDeductions: s.section4Deductions,
      netValue: s.netEstateBeforeAbatement,
      abatement: s.abatementApplied,
      dutiableAmount: s.dutiableEstate,
      dutyPayable: s.estateDutyPayable,
    };
    if (!includeDuty || Math.abs(s.estateDutyPayable - estateDuty) < 0.005) {
      estateDuty = s.estateDutyPayable;
      break;
    }
    estateDuty = s.estateDutyPayable;
  }

  liabilitySections = sectionsWithoutDuty(includeDuty ? estateDuty : 0);
  const totalLiabilities = sum(liabilitySections.map((s) => s.total));
  const balanceForDistribution = roundCurrency(totalAssets - totalLiabilities);
  checks.length = 0;
  const { awards } = distribute(balanceForDistribution);
  const totalAwarded = sum(awards.map((a) => a.total));

  const cashAndRealised = sum(input.assets.filter((a) => a.isCash || a.disposal === "SELL" || a.disposal === "CASH").map(assetAmount));
  const cashLegacies = sum(beneficiaries.map((b) => (b.allocationType === "CASH_LEGACY" ? b.cashLegacyAmount ?? 0 : 0)));
  const cashAvailable = roundCurrency(cashAndRealised - totalLiabilities - cashLegacies);

  // Checks
  if (input.administrationType === "SMALL_ESTATE_S18_3" && totalAssets >= SECTION_18_3_THRESHOLD) {
    checks.push({ code: "S18_3_THRESHOLD", level: "error", message: `Gross value R${totalAssets.toFixed(2)} is not below R250 000 — section 18(3) does not apply.` });
  }
  if (input.administrationType === "SOLVENT" && totalAssets < SECTION_18_3_THRESHOLD) {
    checks.push({ code: "S18_3_ELIGIBLE", level: "info", message: "Gross value is below R250 000; the estate may be administered under section 18(3) (Letter of Authority, no Master's fee)." });
  }
  if (balanceForDistribution < 0) {
    checks.push({ code: "INSOLVENT", level: "error", message: "Liabilities exceed assets. Administer under section 34 (insolvent deceased estate) and notify creditors." });
  }
  if (cashAvailable < 0) {
    checks.push({ code: "CASH_SHORTFALL", level: "warning", message: `Cash shortfall of R${Math.abs(cashAvailable).toFixed(2)}: assets must be realised or heirs must contribute before distribution.` });
  }
  if (inCommunity) {
    checks.push({ code: "IN_COMMUNITY_REVIEW", level: "info", message: "Joint estate: surviving spouse awarded half of (assets less joint debts); administration costs, fees and taxes borne by the deceased's half. Estate duty on half the joint assets. Review against the will and Annexure 7 approach." });
  }
  for (const a of input.assets) if (!a.voucher) checks.push({ code: "VOUCHER_MISSING", level: "warning", message: `No voucher number for asset "${a.description}".` });
  for (const c of input.claims) if (!c.voucher) checks.push({ code: "VOUCHER_MISSING", level: "warning", message: `No voucher for claim by ${c.creditor}.` });
  for (const b of beneficiaries) if (b.isMinor && !b.dateOfBirth) checks.push({ code: "MINOR_DOB", level: "warning", message: `Minor heir ${b.fullName}: date of birth required (reg 5(1)(e)(ii)); minor's inheritance is paid to the Guardian's Fund unless a trust is provided.` });
  if (input.redistribution) checks.push({ code: "REDISTRIBUTION_AGREEMENT", level: "info", message: "Lodge the signed redistribution agreement with the account (reg 5(1)(e)(iii)). Confirm transfer-duty / donations-tax implications of any value shifted between heirs." });
  if (edSummary && edSummary.grossValue > DEFAULT_ABATEMENT) checks.push({ code: "REV267_REQUIRED", level: "info", message: "Gross value exceeds R3.5m: submit the REV267 estate duty return with the L&D account to the Master and SARS." });
  const difference = roundCurrency(balanceForDistribution - totalAwarded);
  if (Math.abs(difference) > 0.01) checks.push({ code: "DISTRIBUTION_DIFFERENCE", level: "error", message: `Distribution account differs from balance for distribution by R${difference.toFixed(2)}.` });

  return {
    kind: "SOLVENT",
    administrationType: input.administrationType,
    heading,
    masterReferenceLine,
    assetSections,
    totalAssets,
    liabilitySections,
    totalLiabilities,
    balanceForDistribution,
    fees: { masterFee, executorFeeOnAssets: exec.onAssets, executorFeeOnIncome: ie.executorFeeOnIncome, executorVat: roundCurrency(exec.vatOnAssets + ie.vatOnIncome), executorFeeBase: totalAssets },
    recapitulation: {
      cashAndRealised,
      liabilities: totalLiabilities,
      cashLegacies,
      cashAvailable,
      deficiencyNote: cashAvailable < 0 ? `Cash deficiency of R${Math.abs(cashAvailable).toFixed(2)} to be settled by realisation of assets or a cash contribution by the heirs.` : undefined,
    },
    incomeAndExpenditure: {
      period: ie.period,
      income: ie.income,
      expenditure: ie.expenditure,
      totalIncome: ie.totalIncome,
      totalExpenditure: ie.totalExpenditure,
      balance: ie.balance,
      balanceNote: ie.balanceNote,
    },
    distribution: { balanceForDistribution, awards, totalAwarded, difference },
    estateDuty: edSummary,
    deadlines: deadlines(input),
    checks,
  };
}

/* ------------------------------------------------------------------------ */
/* Insolvent estates — section 34                                            */
/* ------------------------------------------------------------------------ */

function buildInsolvent(input: LdInput): LdInsolventResult {
  const checks: LdCheck[] = [];
  const { heading, masterReferenceLine } = buildHeading(input);
  const fees = input.fees ?? {};
  const vatRate = fees.executorVatRate ?? 0;
  const rateOnAssets = fees.executorFeeRateOnAssets ?? 0.035;
  const ie = incomeAndExpenditure(input, fees.executorFeeRateOnIncome ?? 0.06, vatRate);

  const securedAssetIds = new Set(input.claims.filter((c) => c.claimClass === "SECURED" && c.securedAssetId).map((c) => c.securedAssetId!));
  const proceeds = (a: LdInput["assets"][number]) => roundCurrency(a.realisedValue ?? a.value);
  const encumbered = input.assets.filter((a) => securedAssetIds.has(a.id));
  const free = input.assets.filter((a) => !securedAssetIds.has(a.id));
  const totalAssets = sum(input.assets.map(proceeds));

  type Acc = LdInsolventAccount & { basis: number; assetId?: string };
  const accounts: Acc[] = encumbered.map((a, i) => ({
    code: String.fromCharCode(65 + i),
    title: `Encumbered Asset – ${a.section === "IMMOVABLE" ? "Immovable Property" : "Movable Property"}: ${a.description}`,
    receipts: [{ no: "1", description: `${a.description} — sold`, voucher: a.voucher, amount: proceeds(a) }],
    payments: [],
    totalReceipts: 0,
    totalPayments: 0,
    balance: 0,
    basis: a.apportionmentBasis ?? proceeds(a),
    assetId: a.id,
  }));
  const freeAcc: Acc = {
    code: String.fromCharCode(65 + encumbered.length),
    title: "Free Residue",
    receipts: free.map((a, i) => ({ no: String(i + 1), description: a.description, voucher: a.voucher, amount: proceeds(a) })),
    payments: [],
    totalReceipts: 0,
    totalPayments: 0,
    balance: 0,
    basis: sum(free.map((a) => a.apportionmentBasis ?? proceeds(a))),
  };
  const all = [...accounts, freeAcc];
  const totalBasis = sum(all.map((a) => a.basis));
  const apportionments: LdInsolventResult["apportionments"] = [];

  const apportion = (description: string, amount: number, voucher?: string) => {
    let given = 0;
    const shares = all.map((acc, i) => {
      const share = i === all.length - 1 ? roundCurrency(amount - given) : roundCurrency(totalBasis ? (amount * acc.basis) / totalBasis : 0);
      given = roundCurrency(given + share);
      acc.payments.push({ no: String(acc.payments.length + 1), description: `${description} (proportion as per schedule)`, voucher, amount: share });
      return { account: acc.code, basis: acc.basis, amount: share };
    });
    apportionments.push({ cost: description, totalAmount: roundCurrency(amount), shares });
  };
  const pay = (acc: Acc, description: string, amount: number, voucher?: string) =>
    acc.payments.push({ no: String(acc.payments.length + 1), description, voucher, amount: roundCurrency(amount) });

  for (const c of input.costs) {
    if (c.assetId) {
      const acc = accounts.find((a) => a.assetId === c.assetId) ?? freeAcc;
      pay(acc, c.description, c.amount, c.voucher);
    } else if (c.apportion) apportion(c.description, c.amount, c.voucher);
    else pay(freeAcc, c.description, c.amount, c.voucher);
  }
  const masterFee = fees.masterFeeOverride ?? calculateMastersFee(totalAssets);
  if (masterFee > 0) apportion("Master's fees", masterFee);
  let execOnAssets = 0;
  let execVat = 0;
  for (const acc of all) {
    const base = sum(acc.receipts.map((r) => r.amount));
    const fee = fees.executorFeeOverride !== undefined ? roundCurrency(totalAssets ? (fees.executorFeeOverride * base) / totalAssets : 0) : roundCurrency(base * rateOnAssets);
    if (fee > 0) {
      pay(acc, fees.executorFeeOverride !== undefined ? "Executor's fees (as agreed, proportionate)" : `Executor's fees: ${(rateOnAssets * 100).toFixed(1)}% of R${base.toFixed(2)}`, fee);
      execOnAssets += fee;
    }
    const vat = roundCurrency(fee * vatRate);
    if (vat > 0) {
      pay(acc, "VAT on executor's fees", vat);
      execVat += vat;
    }
  }

  const creditorAwards: LdCreditorAward[] = [];
  const concurrent: Array<{ creditor: string; amount: number; voucher?: string }> = [];
  for (const acc of accounts) {
    acc.totalReceipts = sum(acc.receipts.map((r) => r.amount));
    acc.totalPayments = sum(acc.payments.map((p) => p.amount));
    let available = roundCurrency(acc.totalReceipts - acc.totalPayments);
    const secured = input.claims
      .filter((c) => c.claimClass === "SECURED" && c.securedAssetId === acc.assetId)
      .sort((a, b) => (a.preferenceRank ?? 0) - (b.preferenceRank ?? 0));
    for (const c of secured) {
      const award = roundCurrency(Math.max(0, Math.min(c.amount, available)));
      available = roundCurrency(available - award);
      const shortfall = roundCurrency(c.amount - award);
      acc.securedCreditor = { creditor: c.creditor, claim: roundCurrency(c.amount), award, shortfall };
      pay(acc, `${c.creditor}: secured claim${c.description ? ` (${c.description})` : ""}`, award, c.voucher);
      creditorAwards.push({ creditor: c.creditor, claimClass: "SECURED", claim: roundCurrency(c.amount), award, deficit: 0, voucher: c.voucher });
      if (shortfall > 0) concurrent.push({ creditor: `${c.creditor} (balance of secured claim)`, amount: shortfall, voucher: c.voucher });
    }
    acc.totalPayments = sum(acc.payments.map((p) => p.amount));
    acc.balance = roundCurrency(acc.totalReceipts - acc.totalPayments);
    if (acc.balance > 0) {
      freeAcc.receipts.push({ no: String(freeAcc.receipts.length + 1), description: `Surplus from encumbered asset account ${acc.code}`, amount: acc.balance });
    } else if (acc.balance < 0) {
      checks.push({ code: "ENCUMBERED_DEFICIT", level: "warning", message: `Costs exceed proceeds in account ${acc.code}; review apportionment.` });
    }
  }
  if (ie.balance !== 0) {
    freeAcc.receipts.push({ no: String(freeAcc.receipts.length + 1), description: "Balance of income and expenditure account", amount: ie.balance });
  }
  freeAcc.totalReceipts = sum(freeAcc.receipts.map((r) => r.amount));
  freeAcc.totalPayments = sum(freeAcc.payments.map((p) => p.amount));
  freeAcc.balance = roundCurrency(freeAcc.totalReceipts - freeAcc.totalPayments);
  let available = Math.max(0, freeAcc.balance);
  const freeResidueAvailable = available;

  const preferent = input.claims.filter((c) => c.claimClass === "PREFERENT");
  const ranks = [...new Set(preferent.map((c) => c.preferenceRank ?? 99))].sort((a, b) => a - b);
  for (const rank of ranks) {
    const group = preferent.filter((c) => (c.preferenceRank ?? 99) === rank);
    const groupTotal = sum(group.map((c) => c.amount));
    const ratio = groupTotal > 0 ? Math.min(1, available / groupTotal) : 0;
    for (const c of group) {
      const award = roundCurrency(c.amount * ratio);
      creditorAwards.push({ creditor: c.creditor, claimClass: "PREFERENT", claim: roundCurrency(c.amount), award, deficit: roundCurrency(c.amount - award), voucher: c.voucher });
    }
    available = roundCurrency(available - Math.min(available, groupTotal));
  }
  for (const c of input.claims.filter((x) => (x.claimClass ?? "CONCURRENT") === "CONCURRENT")) concurrent.push({ creditor: c.creditor, amount: roundCurrency(c.amount), voucher: c.voucher });
  const concurrentTotal = sum(concurrent.map((c) => c.amount));
  const rate = concurrentTotal > 0 ? Math.min(1, available / concurrentTotal) : 0;
  for (const c of concurrent) {
    const award = roundCurrency(c.amount * rate);
    creditorAwards.push({ creditor: c.creditor, claimClass: "CONCURRENT", claim: c.amount, award, deficit: roundCurrency(c.amount - award), voucher: c.voucher });
  }
  if (rate >= 1 && concurrentTotal > 0) {
    checks.push({ code: "APPEARS_SOLVENT", level: "warning", message: "All creditors are paid in full — the estate may be solvent. Reconsider the s34 route." });
  }
  checks.push({ code: "S34_NOTICE", level: "info", message: "s34(1): after the s29 claims period, notify creditors in writing (min. 14 days) that the assets will be realised unless the majority in number and value instruct surrender under the Insolvency Act; lodge a copy with the Master. Creditors under R1 000 are not reckoned in number." });
  checks.push({ code: "S34_SALE_NOTICE", level: "info", message: "s34(2): give creditors at least 14 days' written notice of the manner and conditions of sale before selling assets." });
  checks.push({ code: "PREFERENCE_REVIEW", level: "warning", message: "Preferent ranking and statutory caps (e.g. s96 funeral/death-bed limits) must be verified against the Insolvency Act 24 of 1936 before lodging." });

  return {
    kind: "INSOLVENT_S34",
    administrationType: "INSOLVENT_S34",
    heading,
    masterReferenceLine,
    accounts: all.map(({ basis: _b, assetId: _a, ...rest }) => { void _b; void _a; return rest; }),
    incomeAndExpenditure: {
      period: ie.period,
      income: ie.income,
      expenditure: ie.expenditure,
      totalIncome: ie.totalIncome,
      totalExpenditure: ie.totalExpenditure,
      balance: ie.balance,
      balanceNote: ie.balance >= 0 ? "Balance available for creditors (carried to free residue)." : "Shortfall carried to free residue.",
    },
    apportionments,
    freeResidueAvailable,
    concurrentDividendRate: Math.round(rate * 1_000_000) / 1_000_000,
    creditorAwards,
    fees: { masterFee, executorFeeOnAssets: roundCurrency(execOnAssets), executorFeeOnIncome: ie.executorFeeOnIncome, executorVat: roundCurrency(execVat + ie.vatOnIncome), executorFeeBase: totalAssets },
    deadlines: deadlines(input),
    checks,
  };
}

export function buildLdAccount(input: LdInput): LdResult {
  return input.administrationType === "INSOLVENT_S34" ? buildInsolvent(input) : buildSolvent(input);
}
