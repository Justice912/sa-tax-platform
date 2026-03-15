import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("demo estate engine run store", () => {
  it("persists created and approved runs across store reloads", async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "taxops-demo-engine-store-"));

    const repositoryModule = await import("@/modules/estates/engines/repository");

    const store = repositoryModule.createDemoEstateEngineRunStore({
      storageRoot: tempRoot,
      seedRuns: [],
    });

    const created = await store.createRun({
      estateId: "estate_001",
      yearPackId: "estate_year_pack_2026_v1",
      engineType: "BUSINESS_VALUATION",
      status: "REVIEW_REQUIRED",
      reviewRequired: true,
      inputSnapshot: { subjectDescription: "Golden Demo Trading" },
      outputSnapshot: { report: { summary: { concludedValue: 5400000 } } },
      warnings: [],
      dependencyStates: [],
    });

    await store.updateRunApproval(created.id, {
      status: "APPROVED",
      reviewRequired: false,
      approvedAt: "2026-03-13T10:00:00+02:00",
      approvedByName: "Golden Demo Reviewer",
    });

    const reloadedStore = repositoryModule.createDemoEstateEngineRunStore({
      storageRoot: tempRoot,
      seedRuns: [],
    });

    const runs = await reloadedStore.listRunsForEstate("estate_001");

    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({
      id: created.id,
      status: "APPROVED",
      approvedByName: "Golden Demo Reviewer",
    });
    expect(
      fs.existsSync(path.join(tempRoot, "demo-estate-engine-runs.json")),
    ).toBe(true);
  });
});
