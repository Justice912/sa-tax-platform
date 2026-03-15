import { describe, expect, it } from "vitest";
import { createEstateEngineService } from "@/modules/estates/engines/service";
import type {
  CreateEstateEngineRunInput,
  EstateEngineDependencyState,
  EstateEngineRunRecord,
} from "@/modules/estates/engines/types";

function buildDependencyState(
  overrides: Partial<EstateEngineDependencyState> = {},
): EstateEngineDependencyState {
  return {
    engineType: overrides.engineType ?? "BUSINESS_VALUATION",
    runId: overrides.runId ?? "run_dependency_001",
    status: overrides.status ?? "APPROVED",
    isStale: overrides.isStale ?? false,
    reviewedAt: overrides.reviewedAt ?? "2026-03-12T10:00:00+02:00",
  };
}

function buildRunInput(
  overrides: Partial<CreateEstateEngineRunInput> = {},
): CreateEstateEngineRunInput {
  return {
    estateId: overrides.estateId ?? "estate_001",
    yearPackId: overrides.yearPackId ?? "estate_year_pack_2026_v1",
    engineType: overrides.engineType ?? "BUSINESS_VALUATION",
    inputSnapshot: overrides.inputSnapshot ?? {
      valuationDate: "2026-01-19",
      assumptions: ["Maintainable earnings selected"],
    },
    outputSnapshot: overrides.outputSnapshot ?? {
      concludedValue: 1850000,
      method: "MAINTAINABLE_EARNINGS",
    },
    warnings: overrides.warnings ?? [],
    dependencyStates: overrides.dependencyStates ?? [],
  };
}

function buildStoredRun(
  overrides: Partial<EstateEngineRunRecord> = {},
): EstateEngineRunRecord {
  const base = buildRunInput();

  return {
    id: overrides.id ?? "estate_engine_run_001",
    estateId: overrides.estateId ?? base.estateId,
    yearPackId: overrides.yearPackId ?? base.yearPackId,
    engineType: overrides.engineType ?? base.engineType,
    status: overrides.status ?? "REVIEW_REQUIRED",
    reviewRequired: overrides.reviewRequired ?? true,
    inputSnapshot: overrides.inputSnapshot ?? base.inputSnapshot,
    outputSnapshot: overrides.outputSnapshot ?? base.outputSnapshot,
    warnings: overrides.warnings ?? base.warnings,
    dependencyStates: overrides.dependencyStates ?? base.dependencyStates,
    approvedAt: overrides.approvedAt,
    approvedByName: overrides.approvedByName,
    createdAt: overrides.createdAt ?? "2026-03-12T10:05:00+02:00",
    updatedAt: overrides.updatedAt ?? "2026-03-12T10:05:00+02:00",
  };
}

describe("estate engine service", () => {
  it("creates an engine run with a year-pack reference", async () => {
    let createdRun: EstateEngineRunRecord | null = null;
    const service = createEstateEngineService({
      repository: {
        async createRun(input) {
          createdRun = buildStoredRun({
            yearPackId: input.yearPackId,
            engineType: input.engineType,
            inputSnapshot: input.inputSnapshot,
            outputSnapshot: input.outputSnapshot,
            warnings: input.warnings,
            dependencyStates: input.dependencyStates,
          });

          return createdRun;
        },
        async getRunById() {
          return createdRun;
        },
        async updateRunApproval() {
          throw new Error("Not used in this test");
        },
      },
    });

    const created = await service.createRun(
      buildRunInput({
        engineType: "PRE_DEATH_ITR12",
        yearPackId: "estate_year_pack_2026_v2",
      }),
    );

    expect(created.yearPackId).toBe("estate_year_pack_2026_v2");
    expect(created.engineType).toBe("PRE_DEATH_ITR12");
    expect(createdRun?.yearPackId).toBe("estate_year_pack_2026_v2");
  });

  it("saves structured inputs and outputs", async () => {
    const service = createEstateEngineService({
      repository: {
        async createRun(input) {
          return buildStoredRun({
            inputSnapshot: input.inputSnapshot,
            outputSnapshot: input.outputSnapshot,
          });
        },
        async getRunById() {
          return null;
        },
        async updateRunApproval() {
          throw new Error("Not used in this test");
        },
      },
    });

    const created = await service.createRun(
      buildRunInput({
        inputSnapshot: {
          assets: [{ description: "Primary residence", value: 2350000 }],
        },
        outputSnapshot: {
          grossEstateValue: 2350000,
          notes: ["Awaiting second valuation confirmation"],
        },
      }),
    );

    expect(created.inputSnapshot).toEqual({
      assets: [{ description: "Primary residence", value: 2350000 }],
    });
    expect(created.outputSnapshot).toEqual({
      grossEstateValue: 2350000,
      notes: ["Awaiting second valuation confirmation"],
    });
  });

  it("marks a new run as review-required by default", async () => {
    const service = createEstateEngineService({
      repository: {
        async createRun(input) {
          return buildStoredRun({
            status: input.status,
            reviewRequired: input.reviewRequired,
          });
        },
        async getRunById() {
          return null;
        },
        async updateRunApproval() {
          throw new Error("Not used in this test");
        },
      },
    });

    const created = await service.createRun(buildRunInput());

    expect(created.status).toBe("REVIEW_REQUIRED");
    expect(created.reviewRequired).toBe(true);
  });

  it("approves a run when all upstream dependencies are approved and current", async () => {
    const storedRun = buildStoredRun({
      id: "estate_engine_run_approved",
      dependencyStates: [
        buildDependencyState({ engineType: "BUSINESS_VALUATION" }),
        buildDependencyState({ engineType: "PRE_DEATH_ITR12" }),
      ],
    });

    const service = createEstateEngineService({
      repository: {
        async createRun() {
          throw new Error("Not used in this test");
        },
        async getRunById(runId) {
          return runId === storedRun.id ? storedRun : null;
        },
        async updateRunApproval(runId, approval) {
          expect(runId).toBe(storedRun.id);

          return {
            ...storedRun,
            status: approval.status,
            reviewRequired: approval.reviewRequired,
            approvedAt: approval.approvedAt,
            approvedByName: approval.approvedByName,
            updatedAt: approval.approvedAt,
          };
        },
      },
    });

    const approved = await service.approveRun(storedRun.id, "Ayesha Parker");

    expect(approved.status).toBe("APPROVED");
    expect(approved.reviewRequired).toBe(false);
    expect(approved.approvedByName).toBe("Ayesha Parker");
    expect(approved.approvedAt).toBeDefined();
  });

  it("rejects approval when upstream dependencies are stale or draft", async () => {
    const service = createEstateEngineService({
      repository: {
        async createRun() {
          throw new Error("Not used in this test");
        },
        async getRunById() {
          return buildStoredRun({
            dependencyStates: [
              buildDependencyState({
                engineType: "BUSINESS_VALUATION",
                status: "DRAFT",
              }),
              buildDependencyState({
                engineType: "PRE_DEATH_ITR12",
                status: "APPROVED",
                isStale: true,
              }),
            ],
          });
        },
        async updateRunApproval() {
          throw new Error("Approval should have been blocked");
        },
      },
    });

    await expect(service.approveRun("estate_engine_run_001", "Ayesha Parker")).rejects.toThrow(
      /stale or not approved/i,
    );
  });
});
