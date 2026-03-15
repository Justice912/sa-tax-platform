import { describe, expect, it } from "vitest";
import { buildIndividualTaxReport } from "@/modules/individual-tax/report-transformer";
import { calculateIndividualTax2026 } from "@/modules/individual-tax/calculation-service";

describe("individual tax report transformer", () => {
  it("maps calculations into a rich ita34 print document", () => {
    const calc = calculateIndividualTax2026({
      assessmentYear: 2026,
      salaryIncome: 1324650,
      localInterest: 5493,
      travelAllowance: 324000,
      retirementContributions: 102301,
      travelDeduction: 297124,
      rebates: 17235,
      medicalTaxCredit: 11688,
      paye: 214185.48,
      priorAssessmentDebitOrCredit: -47166.76,
      effectiveTaxRate: 0.278,
    });

    const report = buildIndividualTaxReport({
      referenceNumber: "0441296142",
      taxpayerName: "M MABUTI",
      taxpayerAddress: "17 Vilakazi Street\nOrlando West\nSoweto\n1804",
      assessmentDate: "2025-11-28",
      calc,
    });

    expect(report.sections).toContain("assessment-summary");
    expect(report.sections).toContain("income");
    expect(report.sections).toContain("deductions");
    expect(report.sections).toContain("tax-calculation");
    expect(report.header.title).toBe("INCOME TAX");
    expect(report.header.documentCode).toBe("ITA34");
    expect(report.header.subtitle).toBe("Notice of Assessment");
    expect(report.header.taxpayer.addressLines).toEqual([
      "17 Vilakazi Street",
      "Orlando West",
      "Soweto",
      "1804",
    ]);
    expect(report.header.details.some((detail) => detail.label === "Document number")).toBe(true);
    expect(report.balanceOfAccount.outcomeLabel).toBe("Amount payable by you to SARS");
    expect(report.balanceOfAccount.amount).toBe(calc.summary.netAmountPayable);
    expect(report.complianceInformation.rows).toHaveLength(3);
    expect(report.assessmentSummary.rows.map((row) => row.description)).toEqual([
      "Income",
      "Deductions allowed",
      "Taxable income / Assessed Loss",
      "Assessed tax after rebates",
      "Tax credits and adjustments",
      "Assessment Result",
      "Net credit/debit amount",
    ]);
    expect(report.income.groups[0]?.title).toBe("Employment income [IRP5/IT3(a)]");
    expect(report.income.groups[0]?.rows.map((row) => row.code)).toEqual([
      "3601",
      "3704",
      "3701",
      "3713",
      "3810",
      "3825",
    ]);
    expect(report.income.groups[1]?.title).toBe("Local Interest Income");
    expect(report.deductions.rows.some((row) => row.code === "4029")).toBe(true);
    expect(
      report.deductions.rows.some((row) => row.description.includes("Retirement fund contributions")),
    ).toBe(true);
    expect(
      report.taxCalculation.rows.some((row) => row.description === "Medical Scheme Fees Tax Credit"),
    ).toBe(true);
    expect(report.notes.rows.some((row) => row.label === "Marital status")).toBe(true);
    expect(report.referenceNote).toContain("Always quote this reference number");
  });

  it("fabricates stable document metadata for repeated renders", () => {
    const calc = calculateIndividualTax2026({
      assessmentYear: 2026,
      salaryIncome: 500000,
      localInterest: 1000,
      travelAllowance: 50000,
      retirementContributions: 10000,
      travelDeduction: 5000,
      rebates: 17235,
      medicalTaxCredit: 10000,
      paye: 80000,
      priorAssessmentDebitOrCredit: 0,
      effectiveTaxRate: 0.25,
    });

    const first = buildIndividualTaxReport({
      referenceNumber: "1234567890",
      taxpayerName: "Stable Taxpayer",
      taxpayerAddress: "1 Main Road",
      assessmentDate: "2026-03-09",
      calc,
    });

    const second = buildIndividualTaxReport({
      referenceNumber: "1234567890",
      taxpayerName: "Stable Taxpayer",
      taxpayerAddress: "1 Main Road",
      assessmentDate: "2026-03-09",
      calc,
    });

    expect(first.header.details).toEqual(second.header.details);
    expect(first.complianceInformation.rows).toEqual(second.complianceInformation.rows);
    expect(first.notes.rows).toEqual(second.notes.rows);
  });
});
