import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { buildEstateValuationDocx } from "@/modules/estates/forms/valuation-docx";
import type { EstateValuationReportDocument } from "@/modules/estates/forms/types";

const report = {
  header: {
    title: "Business valuation report",
    taxYear: 2026,
    valuationDate: "2025-09-15",
    estateReference: "012345/2025",
    deceasedName: "Estate of the Late Mr Thabo James Ndlovu",
    executorName: "Mrs Nomsa Ndlovu",
  },
  purpose:
    "Prepared for Estate Duty, CGT on death, ITR12, and Liquidation and Distribution Account support.",
  subject: {
    subjectDescription: "Sizwe Manufacturing (Pty) Ltd",
    subjectType: "COMPANY_SHAREHOLDING",
    registrationNumber: "2012/045678/07",
    industry: "Steel Fabrication & Manufacturing",
    ownershipPercentage: 100,
  },
  methodology: {
    method: "DISCOUNTED_CASH_FLOW",
    nonOperatingAssets: 0,
    liabilities: 0,
  },
  summary: {
    subjectDescription: "Sizwe Manufacturing (Pty) Ltd",
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
  assumptions: [
    "The valuation relies on information supplied by the executor and management.",
  ],
  sourceReferences: [
    "Annual Financial Statements (AFS) for FY2023 to FY2025",
    "Industry reports and publicly available market data",
  ],
  executiveSummary: {
    concludedValue: 12750000,
    weightedAverageValue: 12710000,
    summaryText:
      "Three valuation methodologies were applied and reconciled to a rounded concluded value.",
  },
  businessOverview: {
    legalName: "Sizwe Manufacturing (Pty) Ltd",
    registrationNumber: "2012/045678/07",
    industry: "Steel Fabrication & Manufacturing",
    taxReferenceNumber: "9012345678",
    vatNumber: "4012345678",
    employeeCount: 45,
    narrative:
      "The company is a mid-sized manufacturer of steel components serving construction, mining, and infrastructure sectors.",
  },
  historicalFinancialAnalysis: {
    years: [
      {
        label: "FY2023",
        revenue: 18450000,
        grossProfit: 5900000,
        ebitda: 3500000,
        ebit: 3050000,
        npat: 2022000,
        totalAssets: 9880000,
        totalLiabilities: 2930000,
      },
      {
        label: "FY2024",
        revenue: 21200000,
        grossProfit: 7100000,
        ebitda: 4350000,
        ebit: 3850000,
        npat: 2635000,
        totalAssets: 11360000,
        totalLiabilities: 2775000,
      },
      {
        label: "FY2025",
        revenue: 24600000,
        grossProfit: 8400000,
        ebitda: 5300000,
        ebit: 4750000,
        npat: 3321000,
        totalAssets: 13240000,
        totalLiabilities: 2134000,
      },
    ],
  },
  methodResults: {
    discountedCashFlow: {
      enterpriseValue: 13200000,
      wacc: 0.2019,
      adoptedTerminalValue: 32100000,
      indicatedValue: 13200000,
      fcffSchedule: [
        {
          label: "FY2026",
          revenue: 26500000,
          ebit: 5000000,
          taxOnEbit: 1350000,
          nopat: 3650000,
          depreciation: 600000,
          capitalExpenditure: 800000,
          workingCapitalChange: 250000,
          fcff: 3200000,
          discountFactor: 0.8321,
          presentValue: 2663000,
        },
      ],
      costOfEquity: 0.2148,
      afterTaxCostOfDebt: 0.0858,
      gordonGrowthTerminalValue: 30953000,
      preDiscountEquityValue: 13200000,
      marketabilityDiscountRate: 0.15,
      marketabilityDiscountAmount: 3707000,
      minorityDiscountRate: 0,
      minorityDiscountAmount: 0,
    },
    maintainableEarnings: {
      years: [
        {
          label: "FY2023",
          reportedNpat: 2022000,
          nonRecurringAdjustments: 205000,
          ownerRemunerationAdjustment: -200000,
          normalisedNpat: 2027000,
          weighting: 1,
        },
      ],
      maintainableEarnings: 2656000,
      selectedMultiple: 4.8,
      preDiscountValue: 12749000,
      marketabilityDiscountRate: 0,
      marketabilityDiscountAmount: 0,
      minorityDiscountRate: 0,
      minorityDiscountAmount: 0,
      indicatedValue: 12800000,
    },
    netAssetValue: {
      assets: [
        {
          category: "Property",
          bookValue: 3200000,
          adjustment: 2800000,
          fairMarketValue: 6000000,
        },
      ],
      liabilities: [
        {
          category: "Deferred tax",
          bookValue: 0,
          adjustment: 750000,
          fairMarketValue: 750000,
        },
      ],
      adjustedAssets: 15800000,
      adjustedLiabilities: 4000000,
      indicatedValue: 11800000,
    },
  },
  reconciliation: {
    methods: [
      {
        method: "DISCOUNTED_CASH_FLOW",
        indicatedValue: 13200000,
        weight: 0.4,
        weightedValue: 5280000,
      },
      {
        method: "MAINTAINABLE_EARNINGS",
        indicatedValue: 12800000,
        weight: 0.35,
        weightedValue: 4480000,
      },
      {
        method: "NET_ASSET_VALUE",
        indicatedValue: 11800000,
        weight: 0.25,
        weightedValue: 2950000,
      },
    ],
    weightedAverageValue: 12710000,
    concludedValue: 12750000,
    rationale:
      "The concluded value reflects a weighted reconciliation of DCF, maintainable earnings, and adjusted NAV.",
  },
  sensitivityAnalysis: {
    scenarios: [
      {
        scenario: "Bear Case",
        wacc: 0.22,
        growthRate: 0.03,
        earningsMultiple: 4,
        indicatedValue: 10500000,
      },
      {
        scenario: "Base Case",
        wacc: 0.2019,
        growthRate: 0.05,
        earningsMultiple: 4.8,
        indicatedValue: 12750000,
      },
      {
        scenario: "Bull Case",
        wacc: 0.185,
        growthRate: 0.06,
        earningsMultiple: 5.5,
        indicatedValue: 15200000,
      },
    ],
  },
  taxImplications: {
    cgtSummary: {
      deemedProceeds: 12750000,
      taxableCapitalGain: 4940000,
    },
    estateDutySummary: {
      grossEstate: 19850000,
      dutiableEstate: 3503000,
      estateDutyPayable: 700600,
    },
    section9haNotes: [
      "If the shares are bequeathed to the surviving spouse, the Section 9HA rollover applies.",
    ],
  },
  mandate: {
    engagementMandate: "AME Business Accountants was appointed by the executor.",
    definitionOfValue:
      "The standard of value applied is fair market value as defined by SARS.",
    sourcesOfInformation: [
      "Annual Financial Statements (AFS) for the years ended 28 February 2023, 2024, and 2025",
      "Management accounts for the six months ended 31 August 2025",
    ],
    limitations: [
      "No allowance has been made for changes in legislation after the valuation date.",
    ],
  },
  economicAndIndustryContext: {
    macroeconomicConditions:
      "As at the valuation date, the South African economy was characterised by modest GDP growth.",
    industryOverview:
      "The steel fabrication sector in KwaZulu-Natal experienced steady demand.",
    valueDrivers: ["Established client relationships", "Owned factory premises"],
    keyRisks: ["Key-person dependency", "Volatile steel input costs"],
  },
  methodologySelection: {
    rationale:
      "DCF, maintainable earnings, and NAV were selected due to profitability, growth, and asset backing.",
  },
  rolloverConsiderations: {
    section9haNarrative:
      "The rollover defers, but does not eliminate, the capital gains tax liability.",
  },
  qualificationsAndDisclaimers: [
    "This valuation report has been prepared solely for the purposes stated herein.",
  ],
  appendices: [
    {
      title: "Appendix A: WACC Calculation Detail",
      detail: "Full WACC derivation with CAPM components.",
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

describe("buildEstateValuationDocx", () => {
  it("builds a Word document containing the authoritative valuation sections", async () => {
    const buffer = await buildEstateValuationDocx(report);
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file("word/document.xml")?.async("string");

    expect(buffer.byteLength).toBeGreaterThan(0);
    expect(xml).toContain("CONFIDENTIAL");
    expect(xml).toContain("BUSINESS VALUATION REPORT");
    expect(xml).toContain("1. EXECUTIVE SUMMARY");
    expect(xml).toContain("10. VALUATION CONCLUSION AND RECONCILIATION");
    expect(xml).toContain("11. TAX IMPLICATIONS FOR THE DECEASED ESTATE");
    expect(xml).toContain("Prepared by:");
    expect(xml).toContain("Accepted by (Executor):");
  });
});
