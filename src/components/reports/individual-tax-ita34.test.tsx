import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { calculateIndividualTax2026 } from "@/modules/individual-tax/calculation-service";
import { buildIndividualTaxReport } from "@/modules/individual-tax/report-transformer";
import { IndividualTaxIta34 } from "@/components/reports/individual-tax-ita34";

describe("IndividualTaxIta34", () => {
  it("renders the SARS-style banner, sections, and print affordance", { timeout: 15000 }, () => {
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

    render(<IndividualTaxIta34 report={report} />);

    expect(screen.getByText("INCOME TAX")).toBeInTheDocument();
    expect(screen.getByText("ITA34")).toBeInTheDocument();
    expect(screen.getByText("Notice of Assessment")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print ITA34" })).toBeInTheDocument();
    expect(
      screen.getByText("Always quote this reference number when contacting SARS"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Balance of Account after this Assessment" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Compliance Information" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Assessment Summary Information" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Income" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Deductions allowed" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tax calculation" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Notes" })).toBeInTheDocument();
    expect(screen.getByText("Amount payable by you to SARS")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Detail")).toBeInTheDocument();
    expect(screen.getByTestId("income-section")).toHaveAttribute("data-page-break", "before");
    expect(screen.getByTestId("tax-calculation-section")).toHaveAttribute("data-page-break", "before");
  });
});
