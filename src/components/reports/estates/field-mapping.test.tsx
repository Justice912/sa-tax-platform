import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mapEstateFormFields } from "@/modules/estates/forms/field-mapper";
import { EstateDutyRev267 } from "@/components/reports/estates/estate-duty-rev267";
import { EstatePreDeathSummary } from "@/components/reports/estates/pre-death-summary";
import { EstatePostDeathSummary } from "@/components/reports/estates/post-death-summary";
import { EstateValuationReport } from "@/components/reports/estates/valuation-report";

function buildMappingContext() {
  return {
    estate: {
      estateReference: "EST-2026-0001",
      deceasedName: "Estate Late Nomsa Dube",
      dateOfDeath: "2026-01-19",
      executorName: "Kagiso Dlamini",
      currentStage: "TAX_READINESS" as const,
      liabilities: [],
      beneficiaries: [],
      liquidationEntries: [],
      liquidationDistributions: [],
    },
    taxYear: 2026,
    runs: {
      BUSINESS_VALUATION: {
        calculation: {
          valuationDate: "2026-01-19",
          subjectDescription: "Ubuntu Supplies (Pty) Ltd",
          method: "MAINTAINABLE_EARNINGS",
          concludedValue: 1340000,
          summary: { enterpriseValue: 3350000 },
          assumptions: ["Minority discount ignored for first-pass estimate"],
        },
        report: {
          header: { title: "Business valuation summary", taxYear: 2026, valuationDate: "2026-01-19", estateReference: "EST-2026-0001", deceasedName: "Estate Late Nomsa Dube", executorName: "Kagiso Dlamini" },
          summary: { subjectDescription: "Ubuntu Supplies (Pty) Ltd", method: "MAINTAINABLE_EARNINGS", concludedValue: 1340000, enterpriseValue: 3350000 },
          assumptions: ["Minority discount ignored for first-pass estimate"],
        },
      },
      PRE_DEATH_ITR12: {
        transformedInput: {
          taxpayerName: "Estate Late Nomsa Dube",
          deathTruncatedPeriodEnd: "2026-01-19",
        },
        calculation: {
          assessmentYear: 2026,
          summary: {
            totalIncome: 19000,
            taxableIncome: 19000,
            normalTax: 3420,
            totalCredits: 3800,
            netAmountPayable: 0,
            netAmountRefundable: 380,
          },
        },
      },
      CGT_ON_DEATH: {
        calculation: {
          summary: {
            taxableCapitalGain: 516000,
            aggregateNetCapitalGain: 1590000,
            annualExclusionApplied: 300000,
            inclusionRate: 0.4,
          },
          assetResults: [
            {
              description: "Ubuntu Supplies (Pty) Ltd",
              deemedProceeds: 2350000,
              baseCostUsed: 760000,
              capitalGainBeforeRelief: 1590000,
              reliefApplied: { primaryResidence: 0, spouseRollover: 0 },
              netCapitalGain: 1590000,
            },
          ],
        },
      },
      ESTATE_DUTY: {
        calculation: {
          summary: {
            grossEstateValue: 6000000,
            liabilities: 485000,
            section4Deductions: 100000,
            spouseDeduction: 900000,
            totalDeductions: 1485000,
            netEstateBeforeAbatement: 4515000,
            abatementApplied: 3500000,
            dutiableEstate: 1015000,
            estateDutyPayable: 203000,
          },
        },
      },
      POST_DEATH_IT_AE: {
        calculation: {
          summary: {
            totalIncome: 250000,
            deductions: 20000,
            taxableIncome: 230000,
            appliedRate: 0.45,
            taxPayable: 103500,
          },
        },
      },
    },
  };
}

describe("estate field mapping and report components", () => {
  it("maps engine output fields into formal output structures", () => {
    const context = buildMappingContext();

    const rev267 = mapEstateFormFields("SARS_REV267", context);
    const cgt = mapEstateFormFields("SARS_CGT_DEATH", context);
    const ld = mapEstateFormFields("MASTER_LD_ACCOUNT", context);

    expect(rev267).toMatchObject({
      deceasedName: "Estate Late Nomsa Dube",
      dutiableEstate: 1015000,
      estateDutyPayable: 203000,
    });
    expect(cgt).toMatchObject({
      taxableCapitalGain: 516000,
      aggregateNetCapitalGain: 1590000,
    });
    expect(ld).toMatchObject({
      estateReference: "EST-2026-0001",
      netEstateBeforeAbatement: 4515000,
    });
  });

  it("renders mapped estate report components", () => {
    const context = buildMappingContext();
    const valuation = mapEstateFormFields("BUSINESS_VALUATION_REPORT", context) as Parameters<typeof EstateValuationReport>[0]["report"];
    const preDeath = mapEstateFormFields("SARS_ITR12", context) as Parameters<typeof EstatePreDeathSummary>[0]["report"];
    const postDeath = mapEstateFormFields("SARS_IT_AE", context) as Parameters<typeof EstatePostDeathSummary>[0]["report"];
    const rev267 = mapEstateFormFields("SARS_REV267", context) as Parameters<typeof EstateDutyRev267>[0]["report"];

    render(
      <>
        <EstateValuationReport report={valuation} />
        <EstatePreDeathSummary report={preDeath} />
        <EstatePostDeathSummary report={postDeath} />
        <EstateDutyRev267 report={rev267} />
      </>,
    );

    expect(screen.getByText("Business valuation summary")).toBeInTheDocument();
    expect(screen.getByText("Pre-death ITR12 summary")).toBeInTheDocument();
    expect(screen.getByText("Post-death IT-AE summary")).toBeInTheDocument();
    expect(screen.getByText("SARS Rev267 estate duty summary")).toBeInTheDocument();
    expect(screen.getAllByText("Estate Late Nomsa Dube").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ubuntu Supplies (Pty) Ltd").length).toBeGreaterThan(0);
  });
});
