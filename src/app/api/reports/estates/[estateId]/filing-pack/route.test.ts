import { beforeEach, describe, expect, it, vi } from "vitest";

const getServerSession = vi.fn();
const generateFilingPackManifest = vi.fn();
const generateArtifactManifest = vi.fn();
const save = vi.fn();
const writeAuditLog = vi.fn();
const resolveStoragePath = vi.fn();
const chromiumLaunch = vi.fn();

vi.mock("next-auth/next", () => ({
  getServerSession,
}));

vi.mock("@/lib/auth-options", () => ({
  authOptions: {},
}));

vi.mock("@playwright/test", () => ({
  chromium: {
    launch: chromiumLaunch,
  },
}));

vi.mock("@/modules/estates/forms/service", () => ({
  estateFilingPackService: {
    generateFilingPackManifest,
    generateArtifactManifest,
  },
}));

vi.mock("@/modules/documents/storage-provider", () => ({
  storageProvider: {
    save,
  },
  resolveStoragePath,
}));

vi.mock("@/modules/audit/audit-writer", () => ({
  writeAuditLog,
}));

describe("estate filing-pack route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("stores business valuation reports as Word documents when the artifact format is docx", async () => {
    getServerSession.mockResolvedValue({
      user: {
        id: "user_001",
      },
    });
    generateFilingPackManifest.mockResolvedValue({
      estateId: "estate_001",
      estateReference: "EST-2026-0001",
      taxYear: 2026,
      yearPackId: "estate_year_pack_2026_v3",
      yearPackVersion: 3,
      generatedAt: "2026-03-13T13:30:00+02:00",
      artifacts: [
        {
          code: "BUSINESS_VALUATION_REPORT",
          title: "Business valuation report",
          jurisdiction: "SARS",
          outputFormat: "docx",
          templateVersion: "2026.3",
          templateStorageKey: "estates/forms/business-valuation-report/2026.3.docx",
          status: "READY",
          payload: {
            header: {
              title: "Business valuation report",
              taxYear: 2026,
              valuationDate: "2026-01-19",
              estateReference: "EST-2026-0001",
              deceasedName: "Estate Late Nomsa Dube",
              executorName: "Kagiso Dlamini",
            },
            purpose: "Prepared for estate administration.",
            subject: {
              subjectDescription: "Ubuntu Supplies (Pty) Ltd",
              subjectType: "COMPANY_SHAREHOLDING",
            },
            methodology: {
              method: "NET_ASSET_VALUE",
              nonOperatingAssets: 0,
              liabilities: 0,
            },
            summary: {
              subjectDescription: "Ubuntu Supplies (Pty) Ltd",
              method: "NET_ASSET_VALUE",
              concludedValue: 12750000,
              enterpriseValue: 12750000,
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
            assumptions: [],
            sourceReferences: [],
          },
          sourceRunId: "estate_engine_run_valuation_001",
        },
      ],
    });
    resolveStoragePath.mockImplementation((storageKey: string) => `C:/storage/${storageKey}`);
    save.mockImplementation(async ({ fileName, content }: { fileName: string; content: Buffer }) => ({
      storageKey: `stored/${fileName}`,
      checksum: "abc123",
      sizeBytes: content.length,
    }));
    writeAuditLog.mockResolvedValue(undefined);

    const { GET } = await import(
      "@/app/api/reports/estates/[estateId]/filing-pack/route"
    );

    const response = await GET(
      new Request("http://127.0.0.1/api/reports/estates/estate_001/filing-pack?taxYear=2026"),
      { params: Promise.resolve({ estateId: "estate_001" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.artifacts[0].contentType).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    expect(body.artifacts[0].storageKey).toContain(".docx");
  });

  it("can generate a single filing-pack artifact with a local file path for desktop actions", async () => {
    getServerSession.mockResolvedValue({
      user: {
        id: "user_001",
      },
    });
    generateArtifactManifest.mockResolvedValue({
      estateId: "estate_001",
      estateReference: "EST-2026-0001",
      taxYear: 2026,
      yearPackId: "estate_year_pack_2026_v3",
      yearPackVersion: 3,
      generatedAt: "2026-03-13T13:30:00+02:00",
      artifacts: [
        {
          code: "BUSINESS_VALUATION_REPORT",
          title: "Business valuation report",
          jurisdiction: "SARS",
          outputFormat: "docx",
          templateVersion: "2026.3",
          templateStorageKey: "estates/forms/business-valuation-report/2026.3.docx",
          status: "READY",
          payload: {
            header: {
              title: "Business valuation report",
              taxYear: 2026,
              valuationDate: "2026-01-19",
              estateReference: "EST-2026-0001",
              deceasedName: "Estate Late Nomsa Dube",
              executorName: "Kagiso Dlamini",
            },
            purpose: "Prepared for estate administration.",
            subject: {
              subjectDescription: "Ubuntu Supplies (Pty) Ltd",
              subjectType: "COMPANY_SHAREHOLDING",
            },
            methodology: {
              method: "NET_ASSET_VALUE",
              nonOperatingAssets: 0,
              liabilities: 0,
            },
            summary: {
              subjectDescription: "Ubuntu Supplies (Pty) Ltd",
              method: "NET_ASSET_VALUE",
              concludedValue: 12750000,
              enterpriseValue: 12750000,
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
            assumptions: [],
            sourceReferences: [],
          },
          sourceRunId: "estate_engine_run_valuation_001",
        },
      ],
    });
    resolveStoragePath.mockImplementation((storageKey: string) => `C:/storage/${storageKey}`);
    save.mockImplementation(async ({ fileName, content }: { fileName: string; content: Buffer }) => ({
      storageKey: `uploads/${fileName}`,
      checksum: "abc123",
      sizeBytes: content.length,
    }));
    writeAuditLog.mockResolvedValue(undefined);

    const { GET } = await import(
      "@/app/api/reports/estates/[estateId]/filing-pack/route"
    );

    const response = await GET(
      new Request(
        "http://127.0.0.1/api/reports/estates/estate_001/filing-pack?taxYear=2026&artifactCode=BUSINESS_VALUATION_REPORT",
      ),
      { params: Promise.resolve({ estateId: "estate_001" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.artifacts).toHaveLength(1);
    expect(body.artifacts[0].code).toBe("BUSINESS_VALUATION_REPORT");
    expect(body.artifacts[0].localFilePath).toContain("uploads");
  });

  it("can download the SARS CGT on death report as a PDF", async () => {
    getServerSession.mockResolvedValue({ user: { id: "user_001" } });
    const setContent = vi.fn().mockResolvedValue(undefined);
    const pdf = vi.fn().mockResolvedValue(Buffer.from("pdf-cgt"));
    chromiumLaunch.mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({ setContent, pdf }),
      close: vi.fn().mockResolvedValue(undefined),
    });
    resolveStoragePath.mockImplementation((storageKey: string) => `C:/storage/${storageKey}`);
    save.mockImplementation(async ({ fileName, content }: { fileName: string; content: Buffer }) => ({
      storageKey: `uploads/${fileName}`,
      checksum: "pdf123",
      sizeBytes: content.length,
    }));
    generateArtifactManifest.mockResolvedValue({
      estateId: "estate_001",
      estateReference: "EST-2026-0001",
      taxYear: 2026,
      yearPackId: "estate_year_pack_2026_v3",
      yearPackVersion: 3,
      generatedAt: "2026-03-13T13:30:00+02:00",
      artifacts: [
        {
          code: "SARS_CGT_DEATH",
          title: "SARS CGT on death schedule",
          jurisdiction: "SARS",
          outputFormat: "pdf",
          templateVersion: "2026.3",
          templateStorageKey: "estates/forms/sars-cgt-death/2026.3.pdf",
          status: "READY",
          payload: {
            estateReference: "EST-2026-0001",
            deceasedName: "Estate Late Nomsa Dube",
            dateOfDeath: "2026-01-19",
            taxYear: 2026,
            taxableCapitalGain: 516000,
            aggregateNetCapitalGain: 1590000,
            annualExclusionApplied: 300000,
            inclusionRate: 0.4,
            assetResults: [
              {
                description: "Primary residence in Randburg",
                deemedProceeds: 2350000,
                baseCostUsed: 760000,
                capitalGainBeforeRelief: 1590000,
                netCapitalGain: 0,
              },
            ],
          },
          sourceRunId: "estate_engine_run_cgt_001",
        },
      ],
    });
    writeAuditLog.mockResolvedValue(undefined);

    const { GET } = await import("@/app/api/reports/estates/[estateId]/filing-pack/route");

    const response = await GET(
      new Request(
        "http://127.0.0.1/api/reports/estates/estate_001/filing-pack?taxYear=2026&artifactCode=SARS_CGT_DEATH&download=1",
      ),
      { params: Promise.resolve({ estateId: "estate_001" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("sars-cgt-death");
    expect(Buffer.from(await response.arrayBuffer()).toString("utf8")).toBe("pdf-cgt");
  });

  it("can download the Master liquidation and distribution report as a PDF", async () => {
    getServerSession.mockResolvedValue({ user: { id: "user_001" } });
    const setContent = vi.fn().mockResolvedValue(undefined);
    const pdf = vi.fn().mockResolvedValue(Buffer.from("pdf-master"));
    chromiumLaunch.mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({ setContent, pdf }),
      close: vi.fn().mockResolvedValue(undefined),
    });
    resolveStoragePath.mockImplementation((storageKey: string) => `C:/storage/${storageKey}`);
    save.mockImplementation(async ({ fileName, content }: { fileName: string; content: Buffer }) => ({
      storageKey: `uploads/${fileName}`,
      checksum: "pdf456",
      sizeBytes: content.length,
    }));
    generateArtifactManifest.mockResolvedValue({
      estateId: "estate_001",
      estateReference: "EST-2026-0001",
      taxYear: 2026,
      yearPackId: "estate_year_pack_2026_v3",
      yearPackVersion: 3,
      generatedAt: "2026-03-13T13:30:00+02:00",
      artifacts: [
        {
          code: "MASTER_LD_ACCOUNT",
          title: "Master liquidation and distribution account",
          jurisdiction: "MASTER",
          outputFormat: "pdf",
          templateVersion: "2026.3",
          templateStorageKey: "estates/forms/master-ld-account/2026.3.pdf",
          status: "READY",
          payload: {
            estateReference: "EST-2026-0001",
            deceasedName: "Estate Late Nomsa Dube",
            executorName: "Kagiso Dlamini",
            currentStage: "LD_DRAFTED",
            grossEstateValue: 8350000,
            totalLiabilities: 485000,
            netEstateBeforeAbatement: 6865000,
            estateDutyPayable: 673000,
            beneficiaryCount: 1,
            distributionCount: 1,
            liquidationEntries: [
              {
                description: "Advertising and filing fees",
                category: "ADMINISTRATION_COST",
                amount: 25000,
                effectiveDate: "2026-03-01",
              },
            ],
            distributions: [
              {
                beneficiaryName: "Thando Dube",
                description: "Residue to spouse",
                amount: 1800000,
              },
            ],
          },
          sourceRunId: "estate_engine_run_estate_duty_001",
        },
      ],
    });
    writeAuditLog.mockResolvedValue(undefined);

    const { GET } = await import("@/app/api/reports/estates/[estateId]/filing-pack/route");

    const response = await GET(
      new Request(
        "http://127.0.0.1/api/reports/estates/estate_001/filing-pack?taxYear=2026&artifactCode=MASTER_LD_ACCOUNT&download=1",
      ),
      { params: Promise.resolve({ estateId: "estate_001" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("master-ld-account");
    expect(Buffer.from(await response.arrayBuffer()).toString("utf8")).toBe("pdf-master");
  });

  it("can download the complete filing pack as a ZIP bundle", async () => {
    getServerSession.mockResolvedValue({ user: { id: "user_001" } });
    const setContent = vi.fn().mockResolvedValue(undefined);
    const pdf = vi.fn().mockResolvedValue(Buffer.from("pdf-bundle"));
    chromiumLaunch.mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({ setContent, pdf }),
      close: vi.fn().mockResolvedValue(undefined),
    });
    generateFilingPackManifest.mockResolvedValue({
      estateId: "estate_001",
      estateReference: "EST-2026-0001",
      taxYear: 2026,
      yearPackId: "estate_year_pack_2026_v3",
      yearPackVersion: 3,
      generatedAt: "2026-03-13T13:30:00+02:00",
      artifacts: [
        {
          code: "BUSINESS_VALUATION_REPORT",
          title: "Business valuation report",
          jurisdiction: "SARS",
          outputFormat: "docx",
          templateVersion: "2026.3",
          templateStorageKey: "estates/forms/business-valuation-report/2026.3.docx",
          status: "READY",
          payload: {
            header: {
              title: "Business valuation report",
              taxYear: 2026,
              valuationDate: "2026-01-19",
              estateReference: "EST-2026-0001",
              deceasedName: "Estate Late Nomsa Dube",
              executorName: "Kagiso Dlamini",
            },
            purpose: "Prepared for estate administration.",
            subject: {
              subjectDescription: "Ubuntu Supplies (Pty) Ltd",
              subjectType: "COMPANY_SHAREHOLDING",
            },
            methodology: {
              method: "NET_ASSET_VALUE",
              nonOperatingAssets: 0,
              liabilities: 0,
            },
            summary: {
              subjectDescription: "Ubuntu Supplies (Pty) Ltd",
              method: "NET_ASSET_VALUE",
              concludedValue: 12750000,
              enterpriseValue: 12750000,
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
            assumptions: [],
            sourceReferences: [],
          },
          sourceRunId: "estate_engine_run_valuation_001",
        },
        {
          code: "SARS_CGT_DEATH",
          title: "SARS CGT on death schedule",
          jurisdiction: "SARS",
          outputFormat: "pdf",
          templateVersion: "2026.3",
          templateStorageKey: "estates/forms/sars-cgt-death/2026.3.pdf",
          status: "READY",
          payload: {
            estateReference: "EST-2026-0001",
            deceasedName: "Estate Late Nomsa Dube",
            dateOfDeath: "2026-01-19",
            taxYear: 2026,
            taxableCapitalGain: 516000,
            aggregateNetCapitalGain: 1590000,
            annualExclusionApplied: 300000,
            inclusionRate: 0.4,
            assetResults: [],
          },
          sourceRunId: "estate_engine_run_cgt_001",
        },
      ],
    });
    resolveStoragePath.mockImplementation((storageKey: string) => `C:/storage/${storageKey}`);
    save.mockImplementation(async ({ fileName, content }: { fileName: string; content: Buffer }) => ({
      storageKey: `uploads/${fileName}`,
      checksum: "zip123",
      sizeBytes: content.length,
    }));
    writeAuditLog.mockResolvedValue(undefined);

    const { GET } = await import("@/app/api/reports/estates/[estateId]/filing-pack/route");

    const response = await GET(
      new Request(
        "http://127.0.0.1/api/reports/estates/estate_001/filing-pack?taxYear=2026&bundle=zip&download=1",
      ),
      { params: Promise.resolve({ estateId: "estate_001" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/zip");
    expect(response.headers.get("content-disposition")).toContain(".zip");
  });
});
