import type {
  CreateEstateEngineRunInput,
  EstateEngineDependencyState,
} from "@/modules/estates/engines/types";
import {
  approveEstateEngineRunSchema,
  createEstateEngineRunSchema,
} from "@/modules/estates/engines/validation";
import {
  estateEngineRepository,
  type EstateEngineRepository,
} from "@/modules/estates/engines/repository";

export interface EstateEngineServiceDependencies {
  repository?: EstateEngineRepository;
  now?: () => string;
}

function hasBlockedDependencies(dependencyStates: EstateEngineDependencyState[]) {
  return dependencyStates.some((dependency) => dependency.status !== "APPROVED" || dependency.isStale);
}

export function createEstateEngineService(
  dependencies: EstateEngineServiceDependencies = {},
) {
  const repository = dependencies.repository ?? estateEngineRepository;
  const now = dependencies.now ?? (() => new Date().toISOString());

  return {
    async createRun(input: CreateEstateEngineRunInput) {
      const parsed = createEstateEngineRunSchema.parse(input);

      return repository.createRun({
        ...parsed,
        status: "REVIEW_REQUIRED",
        reviewRequired: true,
      });
    },

    async approveRun(runId: string, approvedByName: string) {
      const parsed = approveEstateEngineRunSchema.parse({ runId, approvedByName });
      const existing = await repository.getRunById(parsed.runId);

      if (!existing) {
        throw new Error("Estate engine run not found.");
      }

      if (hasBlockedDependencies(existing.dependencyStates)) {
        throw new Error(
          "Cannot approve estate engine run while upstream dependencies are stale or not approved.",
        );
      }

      const approvedAt = now();
      const updated = await repository.updateRunApproval(parsed.runId, {
        status: "APPROVED",
        reviewRequired: false,
        approvedAt,
        approvedByName: parsed.approvedByName,
      });

      if (!updated) {
        throw new Error("Estate engine run not found.");
      }

      return updated;
    },
  };
}

export const estateEngineService = createEstateEngineService();
