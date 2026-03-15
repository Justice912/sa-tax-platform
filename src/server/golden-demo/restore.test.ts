import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

interface DemoEstateStore {
  estates: Array<Record<string, unknown>>;
  assets: Array<Record<string, unknown>>;
  liabilities: Array<Record<string, unknown>>;
  beneficiaries: Array<Record<string, unknown>>;
  checklistItems: Array<Record<string, unknown>>;
  stageEvents: Array<Record<string, unknown>>;
  liquidationEntries: Array<Record<string, unknown>>;
  liquidationDistributions: Array<Record<string, unknown>>;
  executorAccess: Array<Record<string, unknown>>;
}

describe("golden demo restore", () => {
  it("adds missing golden records into persisted demo stores without removing unrelated data", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "taxops-golden-demo-restore-"));
    const storageRoot = path.join(tempRoot, "storage");
    fs.mkdirSync(storageRoot, { recursive: true });

    const estateStore: DemoEstateStore = {
      estates: [
        {
          id: "user_estate_001",
          clientId: "user_client_001",
          estateReference: "EST-USER-001",
          deceasedName: "User Estate",
        },
      ],
      assets: [],
      liabilities: [],
      beneficiaries: [],
      checklistItems: [],
      stageEvents: [],
      liquidationEntries: [],
      liquidationDistributions: [],
      executorAccess: [],
    };

    fs.writeFileSync(
      path.join(storageRoot, "demo-estates.json"),
      JSON.stringify(estateStore, null, 2),
      "utf8",
    );
    fs.writeFileSync(
      path.join(storageRoot, "demo-individual-tax-assessments.json"),
      JSON.stringify([], null, 2),
      "utf8",
    );
    fs.writeFileSync(
      path.join(storageRoot, "demo-estate-engine-runs.json"),
      JSON.stringify([], null, 2),
      "utf8",
    );

    const restoreModule = require("../../../desktop/golden-demo-restore.cjs") as {
      restoreGoldenDemoData: (input: { storageRoot: string }) => void;
    };

    restoreModule.restoreGoldenDemoData({ storageRoot });

    const restoredEstates = JSON.parse(
      fs.readFileSync(path.join(storageRoot, "demo-estates.json"), "utf8"),
    ) as DemoEstateStore;
    const restoredAssessments = JSON.parse(
      fs.readFileSync(path.join(storageRoot, "demo-individual-tax-assessments.json"), "utf8"),
    ) as Array<Record<string, unknown>>;
    const restoredRuns = JSON.parse(
      fs.readFileSync(path.join(storageRoot, "demo-estate-engine-runs.json"), "utf8"),
    ) as Array<Record<string, unknown>>;

    expect(restoredEstates.estates.some((estate) => estate.id === "user_estate_001")).toBe(true);
    expect(restoredEstates.estates.some((estate) => estate.id === "golden_estate_001")).toBe(true);
    expect(
      restoredAssessments.some(
        (assessment) => assessment.id === "golden_individual_tax_assessment_001",
      ),
    ).toBe(true);
    expect(
      restoredRuns.some(
        (run) => run.id === "golden_estate_engine_run_business_valuation_001",
      ),
    ).toBe(true);
  });

  it("overwrites drifted golden records back to baseline while preserving user records", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "taxops-golden-demo-drift-"));
    const storageRoot = path.join(tempRoot, "storage");
    fs.mkdirSync(storageRoot, { recursive: true });

    const driftedEstateStore: DemoEstateStore = {
      estates: [
        {
          id: "golden_estate_001",
          clientId: "golden_client_estate_001",
          estateReference: "BROKEN-REF",
          deceasedName: "Tampered Estate",
        },
        {
          id: "user_estate_002",
          clientId: "user_client_002",
          estateReference: "EST-USER-002",
          deceasedName: "Second User Estate",
        },
      ],
      assets: [],
      liabilities: [],
      beneficiaries: [],
      checklistItems: [],
      stageEvents: [],
      liquidationEntries: [],
      liquidationDistributions: [],
      executorAccess: [],
    };

    fs.writeFileSync(
      path.join(storageRoot, "demo-estates.json"),
      JSON.stringify(driftedEstateStore, null, 2),
      "utf8",
    );
    fs.writeFileSync(
      path.join(storageRoot, "demo-individual-tax-assessments.json"),
      JSON.stringify(
        [
          {
            id: "golden_individual_tax_assessment_001",
            taxpayerName: "Tampered Taxpayer",
          },
          {
            id: "user_assessment_001",
            taxpayerName: "User Assessment",
          },
        ],
        null,
        2,
      ),
      "utf8",
    );
    fs.writeFileSync(
      path.join(storageRoot, "demo-estate-engine-runs.json"),
      JSON.stringify(
        [
          {
            id: "golden_estate_engine_run_business_valuation_001",
            engineType: "BUSINESS_VALUATION",
            status: "DRAFT",
          },
          {
            id: "user_engine_run_001",
            engineType: "BUSINESS_VALUATION",
            status: "APPROVED",
          },
        ],
        null,
        2,
      ),
      "utf8",
    );

    const restoreModule = require("../../../desktop/golden-demo-restore.cjs") as {
      restoreGoldenDemoData: (input: { storageRoot: string }) => void;
    };

    restoreModule.restoreGoldenDemoData({ storageRoot });

    const restoredEstates = JSON.parse(
      fs.readFileSync(path.join(storageRoot, "demo-estates.json"), "utf8"),
    ) as DemoEstateStore;
    const restoredAssessments = JSON.parse(
      fs.readFileSync(path.join(storageRoot, "demo-individual-tax-assessments.json"), "utf8"),
    ) as Array<Record<string, unknown>>;
    const restoredRuns = JSON.parse(
      fs.readFileSync(path.join(storageRoot, "demo-estate-engine-runs.json"), "utf8"),
    ) as Array<Record<string, unknown>>;

    expect(
      restoredEstates.estates.find((estate) => estate.id === "golden_estate_001"),
    ).toMatchObject({
      estateReference: "EST-GOLD-2026-0001",
      deceasedName: "Estate Late Lerato Khumalo",
    });
    expect(
      restoredEstates.estates.some((estate) => estate.id === "user_estate_002"),
    ).toBe(true);
    expect(
      restoredAssessments.find(
        (assessment) => assessment.id === "golden_individual_tax_assessment_001",
      ),
    ).toMatchObject({
      taxpayerName: "Anele Maseko",
    });
    expect(
      restoredAssessments.some((assessment) => assessment.id === "user_assessment_001"),
    ).toBe(true);
    expect(
      restoredRuns.find(
        (run) => run.id === "golden_estate_engine_run_business_valuation_001",
      ),
    ).toMatchObject({
      status: "APPROVED",
    });
    expect(restoredRuns.some((run) => run.id === "user_engine_run_001")).toBe(true);
  });
});
