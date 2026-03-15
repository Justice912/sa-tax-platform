import { isDemoMode } from "@/lib/env";
import { prisma } from "@/lib/db";
import { demoEstateYearPacks } from "@/server/demo-data";
import type { EstateYearPackRecord } from "@/modules/estates/year-packs/types";
import { estateYearPackCollectionSchema } from "@/modules/estates/year-packs/validation";

export interface EstateYearPackServiceDependencies {
  listYearPacks?: () => Promise<EstateYearPackRecord[]>;
}

function compareYearPacks(left: EstateYearPackRecord, right: EstateYearPackRecord) {
  if (left.taxYear !== right.taxYear) {
    return left.taxYear - right.taxYear;
  }

  if (left.version !== right.version) {
    return right.version - left.version;
  }

  return (right.approvedAt ?? "").localeCompare(left.approvedAt ?? "");
}

function cloneYearPack(record: EstateYearPackRecord): EstateYearPackRecord {
  return JSON.parse(JSON.stringify(record)) as EstateYearPackRecord;
}

async function listStoredYearPacks(): Promise<EstateYearPackRecord[]> {
  if (isDemoMode || process.env.NODE_ENV === "test") {
    return demoEstateYearPacks.map((record) => cloneYearPack(record));
  }

  const yearPacks = await prisma.estateYearPack.findMany({
    include: {
      formTemplates: true,
    },
    orderBy: [{ taxYear: "asc" }, { version: "desc" }],
  });

  return yearPacks.map((yearPack) => ({
    id: yearPack.id,
    taxYear: yearPack.taxYear,
    version: yearPack.version,
    status: yearPack.status,
    effectiveFrom: yearPack.effectiveFrom.toISOString().slice(0, 10),
    approvedAt: yearPack.approvedAt?.toISOString().slice(0, 10),
    sourceReference: yearPack.sourceReference,
    rules: yearPack.rulesJson as unknown as EstateYearPackRecord["rules"],
    formTemplates: yearPack.formTemplates.map((template) => ({
      code: template.code,
      templateVersion: template.templateVersion,
      outputFormat: template.outputFormat,
      storageKey: template.storageKey,
      metadata:
        template.metadataJson as unknown as EstateYearPackRecord["formTemplates"][number]["metadata"],
    })),
    createdAt: yearPack.createdAt.toISOString(),
    updatedAt: yearPack.updatedAt.toISOString(),
  }));
}

export function createEstateYearPackService(
  dependencies: EstateYearPackServiceDependencies = {},
) {
  const listYearPacks = dependencies.listYearPacks ?? listStoredYearPacks;

  return {
    async listApprovedYearPacks() {
      const parsed = estateYearPackCollectionSchema.parse(await listYearPacks());
      return parsed
        .filter((record) => record.status === "APPROVED")
        .sort(compareYearPacks);
    },

    async getLatestApprovedYearPack(taxYear: number) {
      const approved = await this.listApprovedYearPacks();
      return approved.find((record) => record.taxYear === taxYear) ?? null;
    },
  };
}

export const estateYearPackService = createEstateYearPackService();

export async function listApprovedEstateYearPacks() {
  return estateYearPackService.listApprovedYearPacks();
}

export async function getLatestApprovedEstateYearPack(taxYear: number) {
  return estateYearPackService.getLatestApprovedYearPack(taxYear);
}
