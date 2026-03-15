import { describe, expect, it } from "vitest";
import { createEstateFilingPackService } from "@/modules/estates/forms/service";
import type { EstateDetailRecord } from "@/modules/estates/types";
import type { EstateYearPackRecord } from "@/modules/estates/year-packs/types";
import type { EstateEngineRunRecord } from "@/modules/estates/engines/types";

function buildEstate(overrides: Partial<EstateDetailRecord> = {}): EstateDetailRecord {
  return {
    id: overrides.id ?? "estate_001",
    clientId: overrides.clientId ?? "client_003",
    estateReference: overrides.estateReference ?? "EST-2026-0001",
    deceasedName: overrides.deceasedName ?? "Estate Late Nomsa Dube",
    idNumberOrPassport: overrides.idNumberOrPassport ?? "6702140234081",
    dateOfBirth: overrides.dateOfBirth ?? "1967-02-14",
    dateOfDeath: overrides.dateOfDeath ?? "2026-01-19",
    maritalRegime: overrides.maritalRegime ?? "OUT_OF_COMMUNITY_ACCRUAL",
    taxNumber: overrides.taxNumber ?? "9003344556",
    estateTaxNumber: overrides.estateTaxNumber ?? "9011122233",
    hasWill: overrides.hasWill ?? true,
    executorName: overrides.executorName ?? "Kagiso Dlamini",
    executorCapacity: overrides.executorCapacity ?? "EXECUTOR_TESTAMENTARY",
    executorEmail: overrides.executorEmail ?? "estates@ubuntutax.co.za",
    executorPhone: overrides.executorPhone ?? "+27 82 555 1212",
    assignedPractitionerName:
      overrides.assignedPractitionerName ?? "Sipho Ndlovu",
    currentStage: overrides.currentStage ?? "TAX_READINESS",
    status: overrides.status ?? "ACTIVE",
    notes: overrides.notes,
    createdAt: overrides.createdAt ?? "2026-03-04T09:00:00+02:00",
    updatedAt: overrides.updatedAt ?? "2026-03-08T15:20:00+02:00",
    assets: overrides.assets ?? [
      {
        id: "estate_asset_001",
        estateId: "estate_001",
        category: "BUSINESS_INTEREST",
        description: "Ubuntu Supplies (Pty) Ltd",
        dateOfDeathValue: 6000000,
        baseCost: 1000000,
        acquisitionDate: "2012-01-01",
        valuationDateValue: 0,
        isPrimaryResidence: false,
        isPersonalUse: false,
        spouseRollover: false,
        notes: undefined,
      },
    ],
    liabilities: overrides.liabilities ?? [
      {
        id: "estate_liability_001",
        estateId: "estate_001",
        description: "Mortgage bond outstanding",
        creditorName: "Ubuntu Bank",
        amount: 485000,
        securedByAssetDescription: "Primary residence",
        dueDate: "2026-04-15",
        notes: undefined,
      },
    ],
    beneficiaries: overrides.beneficiaries ?? [],
    checklistItems: overrides.checklistItems ?? [],
    stageEvents: overrides.stageEvents ?? [],
    liquidationEntries: overrides.liquidationEntries ?? [],
    liquidationDistributions: overrides.liquidationDistributions ?? [],
    executorAccess: overrides.executorAccess ?? [],
  };
}

function buildYearPack(): EstateYearPackRecord {
  return {
    id: "estate_year_pack_2026_v3",
    taxYear: 2026,
    version: 3,
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
      postDeathRateMode: "TRUST_RATE",
      postDeathEstateRate: 0.3,
      businessValuationMethods: ["NET_ASSET_VALUE", "MAINTAINABLE_EARNINGS"],
    },
    formTemplates: [
      {
        code: "BUSINESS_VALUATION_REPORT",
        templateVersion: "2026.3",
        outputFormat: "pdf",
        storageKey: "estates/forms/business-valuation-report/2026.3.json",
        metadata: { title: "Business valuation report", jurisdiction: "SARS" },
      },
      {
        code: "SARS_ITR12",
        templateVersion: "2026.3",
        outputFormat: "pdf",
        storageKey: "estates/forms/sars-itr12/2026.3.json",
        metadata: { title: "SARS ITR12 pre-death summary", jurisdiction: "SARS" },
      },
      {
        code: "SARS_CGT_DEATH",
        templateVersion: "2026.3",
        outputFormat: "json",
        storageKey: "estates/forms/sars-cgt-death/2026.3.json",
        metadata: { title: "SARS CGT on death schedule", jurisdiction: "SARS" },
      },
      {
        code: "SARS_REV267",
        templateVersion: "2026.3",
        outputFormat: "pdf",
        storageKey: "estates/forms/sars-rev267/2026.3.json",
        metadata: { title: "SARS Rev267", jurisdiction: "SARS" },
      },
      {
        code: "SARS_IT_AE",
        templateVersion: "2026.3",
        outputFormat: "pdf",
        storageKey: "estates/forms/sars-it-ae/2026.3.json",
        metadata: { title: "SARS IT-AE post-death summary", jurisdiction: "SARS" },
      },
      {
        code: "MASTER_LD_ACCOUNT",
        templateVersion: "2026.3",
        outputFormat: "json",
        storageKey: "estates/forms/master-ld-account/2026.3.json",
        metadata: { title: "Master liquidation and distribution account", jurisdiction: "MASTER" },
      },
    ],
  };
}

function buildApprovedRun(
  overrides: Partial<EstateEngineRunRecord> & Pick<EstateEngineRunRecord, "engineType" | "outputSnapshot">,
): EstateEngineRunRecord {
  return {
    id: overrides.id ?? `${overrides.engineType.toLowerCase()}_run_001`,
    estateId: overrides.estateId ?? "estate_001",
    yearPackId: overrides.yearPackId ?? "estate_year_pack_2026_v3",
    engineType: overrides.engineType,
    status: overrides.status ?? "APPROVED",
    reviewRequired: overrides.reviewRequired ?? false,
    inputSnapshot: overrides.inputSnapshot ?? {},
    outputSnapshot: overrides.outputSnapshot,
    warnings: overrides.warnings ?? [],
    dependencyStates: overrides.dependencyStates ?? [],
    approvedAt: overrides.approvedAt ?? "2026-03-12T12:00:00+02:00",
    approvedByName: overrides.approvedByName ?? "Ayesha Parker",
    createdAt: overrides.createdAt ?? "2026-03-12T12:00:00+02:00",
    updatedAt: overrides.updatedAt ?? "2026-03-12T12:00:00+02:00",
  };
}

function buildApprovedRuns(): EstateEngineRunRecord[] {
  return [
    buildApprovedRun({
      engineType: "BUSINESS_VALUATION",
      outputSnapshot: {
        calculation: {
          valuationDate: "2026-01-19",
          subjectDescription: "Ubuntu Supplies (Pty) Ltd",
          method: "MAINTAINABLE_EARNINGS",
          concludedValue: 1340000,
          summary: { enterpriseValue: 3350000 },
          assumptions: ["Minority discount ignored for first-pass estimate"],
        },
        report: {
          header: { title: "Business valuation summary", taxYear: 2026, valuationDate: "2026-01-19" },
          summary: { subjectDescription: "Ubuntu Supplies (Pty) Ltd", method: "MAINTAINABLE_EARNINGS", concludedValue: 1340000, enterpriseValue: 3350000 },
          assumptions: ["Minority discount ignored for first-pass estimate"],
        },
      },
    }),
    buildApprovedRun({
      engineType: "PRE_DEATH_ITR12",
      outputSnapshot: {
        transformedInput: {
          taxpayerName: "Estate Late Nomsa Dube",
          dateOfDeath: "2026-01-19",
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
          taxCalculationLines: [{ code: "NET_RESULT", amountAssessed: -380 }],
          disclaimer: "Professional review required",
        },
      },
    }),
    buildApprovedRun({
      engineType: "CGT_ON_DEATH",
      outputSnapshot: {
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
          warnings: [],
        },
      },
    }),
    buildApprovedRun({
      engineType: "ESTATE_DUTY",
      outputSnapshot: {
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
    }),
    buildApprovedRun({
      engineType: "POST_DEATH_IT_AE",
      outputSnapshot: {
        calculation: {
          summary: {
            totalIncome: 250000,
            deductions: 20000,
            taxableIncome: 230000,
            appliedRate: 0.45,
            taxPayable: 103500,
          },
          warnings: [],
        },
      },
    }),
  ];
}

describe("estate filing-pack service", () => {
  it("selects the correct year-pack form template versions", async () => {
    const service = createEstateFilingPackService({
      getEstate: async () => buildEstate(),
      getYearPack: async () => buildYearPack(),
      listRuns: async () => buildApprovedRuns(),
      now: () => "2026-03-12T14:00:00+02:00",
    });

    const manifest = await service.generateFilingPackManifest({
      estateId: "estate_001",
      taxYear: 2026,
    });

    expect(manifest.artifacts.find((artifact) => artifact.code === "SARS_REV267")?.templateVersion).toBe("2026.3");
    expect(manifest.artifacts.find((artifact) => artifact.code === "SARS_ITR12")?.templateStorageKey).toBe(
      "estates/forms/sars-itr12/2026.3.json",
    );
  });

  it("blocks generation when required upstream runs are draft or missing", async () => {
    const draftRuns = buildApprovedRuns().map((run) =>
      run.engineType === "CGT_ON_DEATH" ? { ...run, status: "REVIEW_REQUIRED", reviewRequired: true } : run,
    );

    const service = createEstateFilingPackService({
      getEstate: async () => buildEstate(),
      getYearPack: async () => buildYearPack(),
      listRuns: async () => draftRuns,
      now: () => "2026-03-12T14:00:00+02:00",
    });

    await expect(
      service.generateFilingPackManifest({
        estateId: "estate_001",
        taxYear: 2026,
      }),
    ).rejects.toThrow(/approved estate engine runs/i);
  });

  it("generates a filing-pack manifest with all expected artifacts", async () => {
    const service = createEstateFilingPackService({
      getEstate: async () => buildEstate(),
      getYearPack: async () => buildYearPack(),
      listRuns: async () => buildApprovedRuns(),
      now: () => "2026-03-12T14:00:00+02:00",
    });

    const manifest = await service.generateFilingPackManifest({
      estateId: "estate_001",
      taxYear: 2026,
    });

    expect(manifest.generatedAt).toBe("2026-03-12T14:00:00+02:00");
    expect(manifest.artifacts.map((artifact) => artifact.code)).toEqual([
      "BUSINESS_VALUATION_REPORT",
      "SARS_ITR12",
      "SARS_CGT_DEATH",
      "SARS_REV267",
      "SARS_IT_AE",
      "MASTER_LD_ACCOUNT",
    ]);
    expect(manifest.artifacts.every((artifact) => artifact.status === "READY")).toBe(true);
  });

  it("can generate a single artifact manifest without requiring the full filing pack", async () => {
    const service = createEstateFilingPackService({
      getEstate: async () => buildEstate(),
      getYearPack: async () => buildYearPack(),
      listRuns: async () =>
        buildApprovedRuns().filter((run) => run.engineType === "BUSINESS_VALUATION"),
      now: () => "2026-03-12T14:00:00+02:00",
    });

    const manifest = await service.generateArtifactManifest({
      estateId: "estate_001",
      taxYear: 2026,
      code: "BUSINESS_VALUATION_REPORT",
    });

    expect(manifest.artifacts).toHaveLength(1);
    expect(manifest.artifacts[0]?.code).toBe("BUSINESS_VALUATION_REPORT");
    expect(manifest.artifacts[0]?.sourceRunId).toBe("business_valuation_run_001");
  });
});
