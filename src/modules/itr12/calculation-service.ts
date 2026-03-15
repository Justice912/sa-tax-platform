import {
  PROFESSIONAL_REVIEW_DISCLAIMER,
} from "@/lib/disclaimers";
import type {
  ITR12CalculationInput,
  ITR12CalculationLineItem,
  ITR12CalculationOutput,
} from "@/modules/itr12/types";

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildLineItem(
  lineCode: string,
  label: string,
  amount: number,
  working: string,
  assumptions: string[],
): ITR12CalculationLineItem {
  return {
    lineCode,
    label,
    amount: roundCurrency(amount),
    working,
    assumptions,
    sourceReference:
      "Illustrative scaffold for 2026 assessment year. Verify against current SARS guidance and legislation before filing.",
    reviewRequired: true,
  };
}

export function buildITR12CalculationScaffold(
  input: ITR12CalculationInput,
): ITR12CalculationOutput {
  const deductibleRetirementContribution = Math.min(
    input.retirementContribution,
    input.retirementContributionCap,
  );

  const taxableIncome = Math.max(
    0,
    input.employmentIncome +
      input.otherIncome -
      input.deductionsExcludingRetirement -
      deductibleRetirementContribution,
  );

  const grossTax = taxableIncome * input.estimatedTaxRate;
  const totalCredits =
    input.payeWithheld + input.provisionalPayments + input.medicalTaxCredit;
  const netPayableOrRefund = grossTax - totalCredits;

  const lineItems: ITR12CalculationLineItem[] = [
    buildLineItem(
      "TAXABLE_INCOME",
      "Taxable Income Summary",
      taxableIncome,
      "Employment income + other income - deductions - deductible retirement contribution",
      [
        "All income streams captured for the period 2025-03-01 to 2026-02-28.",
        "No advanced adjustments are applied in this scaffold.",
      ],
    ),
    buildLineItem(
      "GROSS_TAX",
      "Estimated Gross Tax",
      grossTax,
      "Taxable income x estimated tax rate",
      [
        "Estimated rate is placeholder logic for workflow preparation, not final tax table computation.",
      ],
    ),
    buildLineItem(
      "PAYE_CREDITS",
      "PAYE Credits",
      input.payeWithheld,
      "Total PAYE withheld from IRP5 documentation",
      ["PAYE figures must be reconciled to source certificates."],
    ),
    buildLineItem(
      "PROVISIONAL_PAYMENTS",
      "Provisional Tax Payments",
      input.provisionalPayments,
      "Sum of provisional payments claimed for the assessment year",
      ["Provisional payments should match SARS statement of account."],
    ),
    buildLineItem(
      "MEDICAL_CREDITS",
      "Medical Tax Credits",
      input.medicalTaxCredit,
      "Medical credits as captured from supporting certificates",
      ["Medical credit logic is scaffold-only and requires final review."],
    ),
    buildLineItem(
      "RETIREMENT_DEDUCTIBLE",
      "Retirement Contribution Cap Check",
      deductibleRetirementContribution,
      "Min(retirement contribution, retirement contribution cap)",
      [
        "Cap value is configurable and must be validated for current law.",
      ],
    ),
    buildLineItem(
      "TOTAL_CREDITS",
      "Total Credits",
      totalCredits,
      "PAYE credits + provisional payments + medical credits",
      ["Credit totals depend on validated source documents."],
    ),
    buildLineItem(
      "NET_PAYABLE_OR_REFUND",
      "Estimated Net Payable / (Refund)",
      netPayableOrRefund,
      "Gross tax - total credits",
      [
        "Positive value indicates estimated payable; negative value indicates estimated refund.",
      ],
    ),
  ];

  return {
    assessmentYear: input.assessmentYear,
    lineItems,
    summary: {
      taxableIncome: roundCurrency(taxableIncome),
      grossTax: roundCurrency(grossTax),
      totalCredits: roundCurrency(totalCredits),
      netPayableOrRefund: roundCurrency(netPayableOrRefund),
    },
    reviewStatus: "REVIEW_REQUIRED",
    legalDisclaimer: PROFESSIONAL_REVIEW_DISCLAIMER,
  };
}

