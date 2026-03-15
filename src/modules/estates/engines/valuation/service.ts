import { estateEngineService } from "@/modules/estates/engines/service";
import type {
  CreateEstateEngineRunInput,
  EstateEngineRunRecord,
} from "@/modules/estates/engines/types";
import {
  getLatestApprovedEstateYearPack,
} from "@/modules/estates/year-packs/service";
import type { EstateYearPackRecord } from "@/modules/estates/year-packs/types";
import type { EstateAssetRecord, EstateDetailRecord } from "@/modules/estates/types";
import {
  getEstateById,
  updateEstateAssetValuationValue,
} from "@/modules/estates/service";
import type {
  EstateValuationRunInput,
  EstateValuationRunResult,
} from "@/modules/estates/engines/valuation/types";
import { estateValuationInputSchema } from "@/modules/estates/engines/valuation/validation";
import { calculateEstateValuation } from "@/modules/estates/engines/valuation/calculation";
import { buildEstateValuationReport } from "@/modules/estates/engines/valuation/report-transformer";

export interface EstateValuationServiceDependencies {
  getYearPack?: (taxYear: number) => Promise<EstateYearPackRecord | null>;
  getEstate?: (estateId: string) => Promise<EstateDetailRecord | null>;
  updateEstateAssetValue?: (
    estateId: string,
    assetId: string,
    values: { dateOfDeathValue: number; valuationDateValue?: number },
  ) => Promise<EstateAssetRecord | null>;
  createEngineRun?: (input: CreateEstateEngineRunInput) => Promise<EstateEngineRunRecord>;
}

export function createEstateValuationService(
  dependencies: EstateValuationServiceDependencies = {},
) {
  const getYearPack =
    dependencies.getYearPack ??
    (async (taxYear: number) => getLatestApprovedEstateYearPack(taxYear));
  const getEstate = dependencies.getEstate ?? getEstateById;
  const updateEstateAssetValue =
    dependencies.updateEstateAssetValue ?? updateEstateAssetValuationValue;
  const createEngineRun =
    dependencies.createEngineRun ?? ((input: CreateEstateEngineRunInput) => estateEngineService.createRun(input));

  return {
    async createValuationRun(input: EstateValuationRunInput): Promise<EstateValuationRunResult> {
      const parsed = estateValuationInputSchema.parse(input);
      const estateId = parsed.estateId ?? input.estateId;
      const taxYear = parsed.taxYear ?? input.taxYear;
      const enabledMethods =
        parsed.enabledMethods && parsed.enabledMethods.length > 0
          ? parsed.enabledMethods
          : parsed.method
            ? [parsed.method]
            : [];
      if (!estateId) {
        throw new Error("Estate id is required.");
      }

      const estate = await getEstate(estateId);
      if (!estate) {
        throw new Error("Estate not found.");
      }

      const yearPack = await getYearPack(taxYear);

      if (!yearPack) {
        throw new Error(`No approved estate year pack found for tax year ${taxYear}.`);
      }

      for (const method of enabledMethods) {
        if (!yearPack.rules.businessValuationMethods.includes(method)) {
          throw new Error(
            `Valuation method ${method} is not enabled for tax year ${taxYear}.`,
          );
        }
      }

      const normalizedInput: EstateValuationRunInput = {
        ...parsed,
        estateId,
        taxYear,
        enabledMethods: parsed.enabledMethods,
        method: parsed.method ?? enabledMethods[0],
      };
      const inputSnapshot = { ...normalizedInput } as Record<string, unknown>;
      const calculation = calculateEstateValuation(normalizedInput);
      if (normalizedInput.assetId) {
        const linkedAsset = estate.assets.find((asset) => asset.id === normalizedInput.assetId);
        if (!linkedAsset) {
          throw new Error("Linked estate asset not found.");
        }

        if (linkedAsset.category !== "BUSINESS_INTEREST") {
          throw new Error("Only business-interest assets can be linked to a valuation run.");
        }

        await updateEstateAssetValue(estateId, normalizedInput.assetId, {
          dateOfDeathValue: calculation.concludedValue,
          valuationDateValue: calculation.concludedValue,
        });
      }

      const report = buildEstateValuationReport(
        taxYear,
        {
          estateReference: estate.estateReference,
          deceasedName: estate.deceasedName,
          executorName: estate.executorName,
        },
        normalizedInput,
        calculation,
      );
      const run = await createEngineRun({
        estateId,
        yearPackId: yearPack.id ?? `estate_year_pack_${yearPack.taxYear}_v${yearPack.version}`,
        engineType: "BUSINESS_VALUATION",
        inputSnapshot,
        outputSnapshot: {
          calculation,
          report,
        },
        warnings: calculation.warnings,
        dependencyStates: [],
      });

      return {
        run,
        calculation,
        report,
      };
    },
  };
}

export const estateValuationService = createEstateValuationService();
