import { describe, expect, it } from "vitest";
import { createEstateValuationService } from "@/modules/estates/engines/valuation/service";
import type { EstateValuationRunInput } from "@/modules/estates/engines/valuation/types";
import type { EstateYearPackRecord } from "@/modules/estates/year-packs/types";

function buildYearPack(): EstateYearPackRecord {
  return {
    id: "estate_year_pack_2026_v1",
    taxYear: 2026,
    version: 1,
    status: "APPROVED",
    effectiveFrom: "2026-03-01",
    approvedAt: "2026-03-12",
    sourceReference: "2026 estate pack",
    rules: {
      cgtInclusionRate: 0.4,
      cgtAnnualExclusionOnDeath: 300000,
      cgtPrimaryResidenceExclusion: 2000000,
      estateDutyAbatement: 3500000,
      estateDutyRateBands: [
        { upTo: 30000000, rate: 0.2 },
        { upTo: null, rate: 0.25 },
      ],
      postDeathFlatRate: 0.45,
      businessValuationMethods: [
        "NET_ASSET_VALUE",
        "MAINTAINABLE_EARNINGS",
        "DISCOUNTED_CASH_FLOW",
      ],
    },
    formTemplates: [
      {
        code: "BUSINESS_VALUATION_REPORT",
        templateVersion: "2026.1",
        outputFormat: "pdf",
        storageKey: "estates/forms/business-valuation-report/2026.1.json",
        metadata: {
          title: "Business valuation report",
          jurisdiction: "SARS",
        },
      },
      {
        code: "SARS_ITR12",
        templateVersion: "2026.1",
        outputFormat: "pdf",
        storageKey: "estates/forms/sars-itr12/2026.1.json",
        metadata: {
          title: "SARS ITR12",
          jurisdiction: "SARS",
        },
      },
      {
        code: "SARS_CGT_DEATH",
        templateVersion: "2026.1",
        outputFormat: "pdf",
        storageKey: "estates/forms/sars-cgt-death/2026.1.json",
        metadata: {
          title: "SARS CGT on death schedule",
          jurisdiction: "SARS",
        },
      },
      {
        code: "SARS_REV267",
        templateVersion: "2026.1",
        outputFormat: "pdf",
        storageKey: "estates/forms/sars-rev267/2026.1.json",
        metadata: {
          title: "SARS Rev267",
          jurisdiction: "SARS",
        },
      },
      {
        code: "SARS_IT_AE",
        templateVersion: "2026.1",
        outputFormat: "pdf",
        storageKey: "estates/forms/sars-it-ae/2026.1.json",
        metadata: {
          title: "SARS IT-AE",
          jurisdiction: "SARS",
        },
      },
      {
        code: "MASTER_LD_ACCOUNT",
        templateVersion: "2026.1",
        outputFormat: "pdf",
        storageKey: "estates/forms/master-ld-account/2026.1.json",
        metadata: {
          title: "Master liquidation and distribution account",
          jurisdiction: "MASTER",
        },
      },
    ],
  };
}

describe("estate valuation service", () => {
  it("supports a comprehensive multi-method valuation for a sole proprietorship", async () => {
    const service = createEstateValuationService({
      getYearPack: async () => buildYearPack(),
      createEngineRun: async (input) => ({
        id: "estate_engine_run_valuation_000",
        ...input,
        status: "REVIEW_REQUIRED",
        reviewRequired: true,
        createdAt: "2026-03-13T10:00:00+02:00",
        updatedAt: "2026-03-13T10:00:00+02:00",
      }),
    });

    const result = await service.createValuationRun({
      estateId: "estate_001",
      taxYear: 2026,
      valuationDate: "2026-01-19",
      subjectType: "SOLE_PROPRIETORSHIP",
      subjectDescription: "Nomsa Dube Fabrication Works",
      assumptions: ["Business continues as a going concern."],
      enabledMethods: ["DISCOUNTED_CASH_FLOW", "MAINTAINABLE_EARNINGS", "NET_ASSET_VALUE"],
      discountedCashFlow: {
        forecastYears: [
          {
            label: "FY2026",
            revenue: 2650000,
            ebit: 500000,
            depreciation: 60000,
            capitalExpenditure: 80000,
            workingCapitalChange: 25000,
          },
          {
            label: "FY2027",
            revenue: 2860000,
            ebit: 545000,
            depreciation: 65000,
            capitalExpenditure: 85000,
            workingCapitalChange: 20000,
          },
        ],
        taxRate: 0.27,
        riskFreeRate: 0.105,
        equityRiskPremium: 0.065,
        beta: 0.92,
        smallCompanyPremium: 0.03,
        keyPersonPremium: 0.02,
        costOfDebt: 0.1175,
        debtWeight: 0.1,
        equityWeight: 0.9,
        perpetualGrowthRate: 0.05,
        terminalExitMultiple: 4.5,
      },
      maintainableEarningsMethod: {
        historicalYears: [
          {
            label: "FY2023",
            reportedNpat: 2022000,
            nonRecurringAdjustments: 205000,
            ownerRemunerationAdjustment: -200000,
            weighting: 1,
          },
          {
            label: "FY2024",
            reportedNpat: 2635000,
            nonRecurringAdjustments: -180000,
            ownerRemunerationAdjustment: -200000,
            weighting: 2,
          },
          {
            label: "FY2025",
            reportedNpat: 3321000,
            nonRecurringAdjustments: 0,
            ownerRemunerationAdjustment: -200000,
            weighting: 3,
          },
        ],
        selectedMultiple: 4.8,
      },
      netAssetValueMethod: {
        assets: [
          { category: "Equipment", bookValue: 1600000, adjustment: 400000 },
          { category: "Inventory", bookValue: 2400000, adjustment: -200000 },
        ],
        liabilities: [
          { category: "Borrowings", bookValue: 400000, adjustment: 0 },
          { category: "Deferred tax", bookValue: 0, adjustment: 750000 },
        ],
      },
      reconciliation: {
        methodWeights: {
          DISCOUNTED_CASH_FLOW: 0.4,
          MAINTAINABLE_EARNINGS: 0.35,
          NET_ASSET_VALUE: 0.25,
        },
        conclusionRounding: 50000,
      },
    } satisfies EstateValuationRunInput);

    expect(result.report.executiveSummary).toBeDefined();
    expect(result.report.methodResults.discountedCashFlow).toBeDefined();
    expect(result.report.methodResults.maintainableEarnings).toBeDefined();
    expect(result.report.methodResults.netAssetValue).toBeDefined();
    expect(result.report.reconciliation.weightedAverageValue).toBeGreaterThan(0);
    expect(result.report.taxImplications.section9haNotes.length).toBeGreaterThan(0);
  });

  it("captures the selected method and assumptions in the stored engine output", async () => {
    let persistedRunInput: Record<string, unknown> | null = null;
    const service = createEstateValuationService({
      getYearPack: async () => buildYearPack(),
      createEngineRun: async (input) => {
        persistedRunInput = input.outputSnapshot;

        return {
          id: "estate_engine_run_valuation_001",
          ...input,
          status: "REVIEW_REQUIRED",
          reviewRequired: true,
          createdAt: "2026-03-12T10:30:00+02:00",
          updatedAt: "2026-03-12T10:30:00+02:00",
        };
      },
    });

    const result = await service.createValuationRun({
      estateId: "estate_001",
      taxYear: 2026,
      valuationDate: "2026-01-19",
      subjectType: "SOLE_PROPRIETORSHIP",
      subjectDescription: "Nomsa Dube consulting practice",
      method: "NET_ASSET_VALUE",
      assetValue: 1400000,
      nonOperatingAssets: 150000,
      liabilities: 250000,
      assumptions: ["Assets verified to date of death"],
    });

    expect(result.calculation.method).toBe("NET_ASSET_VALUE");
    expect(result.calculation.assumptions).toEqual(["Assets verified to date of death"]);
    expect(persistedRunInput).toMatchObject({
      calculation: {
        method: "NET_ASSET_VALUE",
      },
    });
  });

  it("transforms the valuation into a summary report payload", async () => {
    const service = createEstateValuationService({
      getYearPack: async () => buildYearPack(),
      createEngineRun: async (input) => ({
        id: "estate_engine_run_valuation_002",
        ...input,
        status: "REVIEW_REQUIRED",
        reviewRequired: true,
        createdAt: "2026-03-12T10:40:00+02:00",
        updatedAt: "2026-03-12T10:40:00+02:00",
      }),
    });

    const result = await service.createValuationRun({
      estateId: "estate_001",
      taxYear: 2026,
      valuationDate: "2026-01-19",
      subjectType: "COMPANY_SHAREHOLDING",
      subjectDescription: "Ubuntu Supplies (Pty) Ltd",
      method: "MAINTAINABLE_EARNINGS",
      maintainableEarnings: 900000,
      earningsMultiple: 4,
      nonOperatingAssets: 250000,
      liabilities: 500000,
      shareholdingPercentage: 40,
      assumptions: ["Minority discount ignored for first-pass estimate"],
    });

    expect(result.report.header.title).toBe("Business valuation report");
    expect(result.report.summary.concludedValue).toBe(1340000);
    expect(result.report.summary.method).toBe("MAINTAINABLE_EARNINGS");
  });

  it("supports discounted cash flow calculations as a primary method", async () => {
    const service = createEstateValuationService({
      getYearPack: async () => buildYearPack(),
      createEngineRun: async (input) => ({
        id: "estate_engine_run_valuation_002b",
        ...input,
        status: "REVIEW_REQUIRED",
        reviewRequired: true,
        createdAt: "2026-03-12T10:45:00+02:00",
        updatedAt: "2026-03-12T10:45:00+02:00",
      }),
    });

    const result = await service.createValuationRun({
      estateId: "estate_001",
      taxYear: 2026,
      valuationDate: "2026-01-19",
      subjectType: "COMPANY_SHAREHOLDING",
      subjectDescription: "Ubuntu Supplies (Pty) Ltd",
      assumptions: ["Management forecasts adopted for valuation."],
      enabledMethods: ["DISCOUNTED_CASH_FLOW"],
      discountedCashFlow: {
        forecastYears: [
          {
            label: "FY2026",
            revenue: 26500000,
            ebit: 5000000,
            depreciation: 600000,
            capitalExpenditure: 800000,
            workingCapitalChange: 250000,
          },
          {
            label: "FY2027",
            revenue: 28600000,
            ebit: 5450000,
            depreciation: 650000,
            capitalExpenditure: 850000,
            workingCapitalChange: 200000,
          },
          {
            label: "FY2028",
            revenue: 30600000,
            ebit: 5900000,
            depreciation: 700000,
            capitalExpenditure: 900000,
            workingCapitalChange: 180000,
          },
        ],
        taxRate: 0.27,
        riskFreeRate: 0.105,
        equityRiskPremium: 0.065,
        beta: 0.92,
        smallCompanyPremium: 0.03,
        keyPersonPremium: 0.02,
        costOfDebt: 0.1175,
        debtWeight: 0.1,
        equityWeight: 0.9,
        perpetualGrowthRate: 0.05,
        terminalExitMultiple: 4.5,
        cashAndEquivalents: 2200000,
        interestBearingDebt: 650000,
        directorLoan: 850000,
        marketabilityDiscountRate: 0.15,
      },
      reconciliation: {
        methodWeights: {
          DISCOUNTED_CASH_FLOW: 1,
        },
      },
      shareholdingPercentage: 100,
    } satisfies EstateValuationRunInput);

    expect(result.report.methodResults.discountedCashFlow.fcffSchedule.length).toBe(3);
    expect(result.report.methodResults.discountedCashFlow.wacc).toBeGreaterThan(0);
    expect(result.report.methodResults.discountedCashFlow.adoptedTerminalValue).toBeGreaterThan(0);
  });

  it("produces downstream CGT-ready valuation output", async () => {
    const service = createEstateValuationService({
      getYearPack: async () => buildYearPack(),
      createEngineRun: async (input) => ({
        id: "estate_engine_run_valuation_003",
        ...input,
        status: "REVIEW_REQUIRED",
        reviewRequired: true,
        createdAt: "2026-03-12T10:50:00+02:00",
        updatedAt: "2026-03-12T10:50:00+02:00",
      }),
    });

    const result = await service.createValuationRun({
      estateId: "estate_001",
      taxYear: 2026,
      valuationDate: "2026-01-19",
      subjectType: "COMPANY_SHAREHOLDING",
      subjectDescription: "Ubuntu Supplies (Pty) Ltd",
      method: "MAINTAINABLE_EARNINGS",
      maintainableEarnings: 900000,
      earningsMultiple: 4,
      nonOperatingAssets: 250000,
      liabilities: 500000,
      shareholdingPercentage: 40,
      assumptions: ["Minority discount ignored for first-pass estimate"],
    });

    expect(result.calculation.downstreamCgtInput).toEqual({
      assetDescription: "Ubuntu Supplies (Pty) Ltd",
      marketValueAtDeath: 1340000,
      valuationDate: "2026-01-19",
      valuationMethod: "MAINTAINABLE_EARNINGS",
    });
  });

  it("updates the linked business-interest asset value and builds a SARS-style support pack", async () => {
    let updatedAsset: {
      estateId: string;
      assetId: string;
      dateOfDeathValue: number;
    } | null = null;

    const service = createEstateValuationService({
      getEstate: async () => ({
        id: "estate_001",
        clientId: "client_001",
        estateReference: "EST-2026-0001",
        deceasedName: "Estate Late Nomsa Dube",
        idNumberOrPassport: "6702140234081",
        dateOfDeath: "2026-01-19",
        maritalRegime: "OUT_OF_COMMUNITY_ACCRUAL",
        hasWill: true,
        executorName: "Kagiso Dlamini",
        executorCapacity: "EXECUTOR_TESTAMENTARY",
        assignedPractitionerName: "Sipho Ndlovu",
        currentStage: "VALUES_CAPTURED",
        status: "ACTIVE",
        createdAt: "2026-03-12T08:00:00+02:00",
        updatedAt: "2026-03-12T08:00:00+02:00",
        assets: [
          {
            id: "asset_business_001",
            estateId: "estate_001",
            category: "BUSINESS_INTEREST",
            description: "Ubuntu Supplies (Pty) Ltd",
            dateOfDeathValue: 0,
            isPrimaryResidence: false,
            isPersonalUse: false,
            spouseRollover: false,
          },
        ],
        liabilities: [],
        beneficiaries: [],
        checklistItems: [],
        stageEvents: [],
        liquidationEntries: [],
        liquidationDistributions: [],
        executorAccess: [],
      }),
      getYearPack: async () => buildYearPack(),
      updateEstateAssetValue: async (estateId, assetId, values) => {
        updatedAsset = {
          estateId,
          assetId,
          dateOfDeathValue: values.dateOfDeathValue,
        };

        return {
          id: assetId,
          estateId,
          category: "BUSINESS_INTEREST",
          description: "Ubuntu Supplies (Pty) Ltd",
          dateOfDeathValue: values.dateOfDeathValue,
          isPrimaryResidence: false,
          isPersonalUse: false,
          spouseRollover: false,
        };
      },
      createEngineRun: async (input) => ({
        id: "estate_engine_run_valuation_004",
        ...input,
        status: "REVIEW_REQUIRED",
        reviewRequired: true,
        createdAt: "2026-03-12T11:00:00+02:00",
        updatedAt: "2026-03-12T11:00:00+02:00",
      }),
    });

    const result = await service.createValuationRun({
      estateId: "estate_001",
      assetId: "asset_business_001",
      taxYear: 2026,
      valuationDate: "2026-01-19",
      subjectType: "COMPANY_SHAREHOLDING",
      subjectDescription: "Ubuntu Supplies (Pty) Ltd",
      method: "MAINTAINABLE_EARNINGS",
      maintainableEarnings: 900000,
      earningsMultiple: 4,
      nonOperatingAssets: 250000,
      liabilities: 500000,
      shareholdingPercentage: 40,
      registrationNumber: "2012/123456/07",
      industry: "Wholesale distribution",
      latestAnnualFinancialStatementsOnFile: true,
      priorYearAnnualFinancialStatementsOnFile: true,
      twoYearsPriorAnnualFinancialStatementsOnFile: true,
      executorAuthorityOnFile: true,
      acquisitionDocumentsOnFile: true,
      rev246Required: false,
      rev246Included: false,
      patentValuationRequired: false,
      patentValuationIncluded: false,
      reportNotes: "Prepared for SARS estate duty and CGT support.",
      assumptions: ["Minority discount ignored for first-pass estimate"],
    });

    expect(updatedAsset).toEqual({
      estateId: "estate_001",
      assetId: "asset_business_001",
      dateOfDeathValue: 1340000,
    });
    expect(result.report.header.title).toBe("Business valuation report");
    expect(result.report.subject.registrationNumber).toBe("2012/123456/07");
    expect(result.report.supportChecklist.latestAnnualFinancialStatementsOnFile).toBe(true);
    expect(result.report.supportChecklist.executorAuthorityOnFile).toBe(true);
  });
});
