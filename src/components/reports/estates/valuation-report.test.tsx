import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EstateValuationReport } from "@/components/reports/estates/valuation-report";
import type { EstateValuationReportDocument } from "@/modules/estates/forms/types";

const comprehensiveReport = {
  header: {
    title: "Business valuation report",
    taxYear: 2026,
    valuationDate: "2026-01-19",
    estateReference: "EST-2026-0001",
    deceasedName: "Estate Late Nomsa Dube",
    executorName: "Kagiso Dlamini",
  },
  purpose:
    "Prepared to support SARS estate duty, CGT on death, and estate administration at date of death.",
  subject: {
    subjectDescription: "Ubuntu Supplies (Pty) Ltd",
    subjectType: "COMPANY_SHAREHOLDING",
  },
  methodology: {
    method: "DISCOUNTED_CASH_FLOW",
    nonOperatingAssets: 0,
    liabilities: 0,
  },
  summary: {
    subjectDescription: "Ubuntu Supplies (Pty) Ltd",
    method: "DISCOUNTED_CASH_FLOW",
    concludedValue: 12750000,
    enterpriseValue: 13200000,
  },
  supportChecklist: {
    latestAnnualFinancialStatementsOnFile: true,
    priorYearAnnualFinancialStatementsOnFile: true,
    twoYearsPriorAnnualFinancialStatementsOnFile: true,
    executorAuthorityOnFile: true,
    acquisitionDocumentsOnFile: true,
    rev246Required: false,
    rev246Included: false,
    patentValuationRequired: false,
    patentValuationIncluded: false,
  },
  assumptions: ["Management information was supplied by the executor and business records."],
  sourceReferences: ["SARS valuation support checklist"],
  executiveSummary: {
    concludedValue: 12750000,
    weightedAverageValue: 12710000,
    summaryText: "Weighted across DCF, maintainable earnings, and NAV.",
  },
  businessOverview: {
    legalName: "Ubuntu Supplies (Pty) Ltd",
    registrationNumber: "2012/123456/07",
    industry: "Wholesale distribution",
    narrative: "Established distribution business with recurring customers.",
  },
  historicalFinancialAnalysis: {
    years: [
      { label: "FY2023", revenue: 18450000, ebitda: 3500000, npat: 2022000 },
      { label: "FY2024", revenue: 21200000, ebitda: 4350000, npat: 2635000 },
      { label: "FY2025", revenue: 24600000, ebitda: 5300000, npat: 3321000 },
    ],
  },
  methodResults: {
    discountedCashFlow: {
      enterpriseValue: 13200000,
      wacc: 0.2019,
      adoptedTerminalValue: 32100000,
      indicatedValue: 13200000,
      fcffSchedule: [
        { label: "FY2026", fcff: 3200000, discountFactor: 0.8321, presentValue: 2663000, ebit: 0, taxOnEbit: 0, nopat: 0, depreciation: 0, capitalExpenditure: 0, workingCapitalChange: 0 },
      ],
      costOfEquity: 0.2148,
      afterTaxCostOfDebt: 0.0858,
      gordonGrowthTerminalValue: 30953000,
      preDiscountEquityValue: 13200000,
      marketabilityDiscountRate: 0,
      marketabilityDiscountAmount: 0,
      minorityDiscountRate: 0,
      minorityDiscountAmount: 0,
    },
    maintainableEarnings: {
      maintainableEarnings: 2656000,
      selectedMultiple: 4.8,
      indicatedValue: 12800000,
      years: [],
      preDiscountValue: 12800000,
      marketabilityDiscountRate: 0,
      marketabilityDiscountAmount: 0,
      minorityDiscountRate: 0,
      minorityDiscountAmount: 0,
    },
    netAssetValue: {
      adjustedAssets: 15800000,
      adjustedLiabilities: 4000000,
      indicatedValue: 11800000,
      assets: [],
      liabilities: [],
    },
  },
  reconciliation: {
    methods: [
      { method: "DISCOUNTED_CASH_FLOW", indicatedValue: 13200000, weight: 0.4, weightedValue: 5280000 },
      { method: "MAINTAINABLE_EARNINGS", indicatedValue: 12800000, weight: 0.35, weightedValue: 4480000 },
      { method: "NET_ASSET_VALUE", indicatedValue: 11800000, weight: 0.25, weightedValue: 2950000 },
    ],
    weightedAverageValue: 12710000,
    concludedValue: 12750000,
    rationale: "Weighted across DCF, maintainable earnings, and NAV.",
  },
  taxImplications: {
    cgtSummary: { deemedProceeds: 12750000, taxableCapitalGain: 4940000 },
    estateDutySummary: { grossEstate: 19850000, dutiableEstate: 3503000, estateDutyPayable: 700600 },
    section9haNotes: ["Section 9HA rollover may defer the immediate CGT charge."],
  },
  mandate: {
    engagementMandate: "Independent valuation mandate accepted by the executor.",
    definitionOfValue:
      "Fair market value is the price a willing buyer would pay a willing seller.",
    sourcesOfInformation: [
      "Annual financial statements for FY2023 to FY2025",
      "Management accounts to valuation date",
    ],
    limitations: [
      "The valuation relies on records provided by the executor and management.",
    ],
  },
  economicAndIndustryContext: {
    macroeconomicConditions:
      "The South African economy was characterised by modest GDP growth and elevated rates.",
    industryOverview:
      "The steel fabrication sector in KwaZulu-Natal experienced steady demand.",
    valueDrivers: ["Established client relationships", "Owned factory premises"],
    keyRisks: ["Key-person dependency", "Volatile steel input costs"],
  },
  methodologySelection: {
    rationale:
      "DCF, maintainable earnings, and adjusted NAV were selected as the primary methods.",
  },
  rolloverConsiderations: {
    section9haNarrative:
      "If the shares pass to the surviving spouse, the Section 9HA rollover applies.",
  },
  qualificationsAndDisclaimers: [
    "This valuation is prepared solely for the purposes stated in the report.",
  ],
  appendices: [
    {
      title: "Appendix A: WACC Calculation Detail",
      detail: "Full WACC derivation supporting the DCF calculation.",
    },
  ],
  glossary: [
    {
      term: "WACC",
      definition: "Weighted Average Cost of Capital",
    },
  ],
  signOff: {
    preparedByLabel: "Prepared by:",
    acceptedByLabel: "Accepted by (Executor):",
  },
} as unknown as EstateValuationReportDocument;

describe("EstateValuationReport", () => {
  it("renders a comprehensive multi-method valuation report", () => {
    render(
      <EstateValuationReport report={comprehensiveReport} />,
    );

    expect(screen.getByRole("heading", { name: "Executive summary" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Historical financial analysis" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Discounted cash flow (DCF)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Valuation conclusion and reconciliation" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Tax implications for the deceased estate" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Purpose, scope and mandate" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Economic and industry context" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Section 9HA rollover considerations" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Qualifications, disclaimers and representations" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Appendices" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Glossary of terms" })).toBeInTheDocument();
  });

  it("renders a SARS-style valuation report with support-pack detail", () => {
    render(
      <EstateValuationReport
        report={{
          header: {
            title: "Business valuation report",
            taxYear: 2026,
            valuationDate: "2026-01-19",
            estateReference: "EST-2026-0001",
            deceasedName: "Estate Late Nomsa Dube",
            executorName: "Kagiso Dlamini",
          },
          purpose:
            "Prepared to support SARS estate duty, CGT on death, and estate administration at date of death.",
          subject: {
            subjectDescription: "Ubuntu Supplies (Pty) Ltd",
            subjectType: "COMPANY_SHAREHOLDING",
            registrationNumber: "2012/123456/07",
            industry: "Wholesale distribution",
            ownershipPercentage: 40,
          },
          methodology: {
            method: "MAINTAINABLE_EARNINGS",
            maintainableEarnings: 900000,
            earningsMultiple: 4,
            nonOperatingAssets: 250000,
            liabilities: 500000,
          },
          summary: {
            subjectDescription: "Ubuntu Supplies (Pty) Ltd",
            method: "MAINTAINABLE_EARNINGS",
            concludedValue: 1340000,
            enterpriseValue: 3350000,
          },
          supportChecklist: {
            latestAnnualFinancialStatementsOnFile: true,
            priorYearAnnualFinancialStatementsOnFile: true,
            twoYearsPriorAnnualFinancialStatementsOnFile: true,
            executorAuthorityOnFile: true,
            acquisitionDocumentsOnFile: true,
            rev246Required: false,
            rev246Included: false,
            patentValuationRequired: false,
            patentValuationIncluded: false,
          },
          assumptions: ["Minority discount ignored for first-pass estimate"],
          notes: "Prepared for SARS estate duty and CGT support.",
          sourceReferences: ["SARS Valuation Pack Checklist", "AME Pro Deceased Estate Module Spec"],
        }}
      />,
    );

    expect(screen.getByText("Business valuation report")).toBeInTheDocument();
    expect(screen.getByText(/Prepared to support SARS estate duty/i)).toBeInTheDocument();
    expect(screen.getByText("SARS valuation support pack")).toBeInTheDocument();
    expect(screen.getByText("Registration number")).toBeInTheDocument();
    expect(screen.getByText("2012/123456/07")).toBeInTheDocument();
    expect(screen.getByText("Support documents on file")).toBeInTheDocument();
  });
});
