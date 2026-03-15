import { estateEngineService } from "@/modules/estates/engines/service";
import type { CreateEstateEngineRunInput, EstateEngineDependencyState, EstateEngineRunRecord } from "@/modules/estates/engines/types";
import { getEstateById } from "@/modules/estates/service";
import { getLatestApprovedEstateYearPack } from "@/modules/estates/year-packs/service";
import type { EstateDetailRecord } from "@/modules/estates/types";
import type { EstateYearPackRecord } from "@/modules/estates/year-packs/types";
import type { EstateDutyRunInput, EstateDutyRunResult } from "@/modules/estates/engines/estate-duty/types";
import { estateDutyRunInputSchema } from "@/modules/estates/engines/estate-duty/validation";
import { calculateEstateDuty } from "@/modules/estates/engines/estate-duty/calculation";

export interface EstateDutyServiceDependencies {
  getEstate?: (estateId: string) => Promise<EstateDetailRecord | null>;
  getYearPack?: (taxYear: number) => Promise<EstateYearPackRecord | null>;
  createEngineRun?: (input: CreateEstateEngineRunInput) => Promise<EstateEngineRunRecord>;
}

function hasApprovedCurrentDependency(
  dependencyStates: EstateEngineDependencyState[],
  engineType: EstateEngineDependencyState["engineType"],
) {
  return dependencyStates.some(
    (dependency) =>
      dependency.engineType === engineType &&
      dependency.status === "APPROVED" &&
      dependency.isStale === false,
  );
}

function validateRequiredDependencies(
  estate: EstateDetailRecord,
  dependencyStates: EstateEngineDependencyState[],
) {
  const requiresCgt = estate.assets.length > 0;
  const requiresValuation = estate.assets.some((asset) => asset.category === "BUSINESS_INTEREST");

  if (
    (requiresCgt && !hasApprovedCurrentDependency(dependencyStates, "CGT_ON_DEATH")) ||
    (requiresValuation && !hasApprovedCurrentDependency(dependencyStates, "BUSINESS_VALUATION"))
  ) {
    throw new Error(
      "Estate duty engine requires approved and current CGT and valuation dependencies where applicable.",
    );
  }
}

export function createEstateDutyService(
  dependencies: EstateDutyServiceDependencies = {},
) {
  const getEstate = dependencies.getEstate ?? getEstateById;
  const getYearPack = dependencies.getYearPack ?? getLatestApprovedEstateYearPack;
  const createEngineRun =
    dependencies.createEngineRun ??
    ((input: CreateEstateEngineRunInput) => estateEngineService.createRun(input));

  return {
    async createEstateDutyRun(input: EstateDutyRunInput): Promise<EstateDutyRunResult> {
      const parsed = estateDutyRunInputSchema.parse(input);
      const estate = await getEstate(parsed.estateId);

      if (!estate) {
        throw new Error("Estate not found.");
      }

      validateRequiredDependencies(estate, parsed.dependencyStates);

      const yearPack = await getYearPack(parsed.taxYear);
      if (!yearPack) {
        throw new Error(`No approved estate year pack found for tax year ${parsed.taxYear}.`);
      }

      const yearPackId = yearPack.id ?? `estate_year_pack_${yearPack.taxYear}_v${yearPack.version}`;
      const calculation = calculateEstateDuty({
        estateDutyRateBands: yearPack.rules.estateDutyRateBands,
        estateDutyAbatement: yearPack.rules.estateDutyAbatement,
        grossEstateValue: estate.assets.reduce((sum, asset) => sum + asset.dateOfDeathValue, 0),
        liabilities: estate.liabilities.reduce((sum, liability) => sum + liability.amount, 0),
        section4Deductions: parsed.section4Deductions,
        spouseDeduction: parsed.spouseDeduction,
        deemedPropertyItems: parsed.deemedPropertyItems,
      });

      const run = await createEngineRun({
        estateId: estate.id,
        yearPackId,
        engineType: "ESTATE_DUTY",
        inputSnapshot: parsed,
        outputSnapshot: {
          calculation,
        },
        warnings: [],
        dependencyStates: parsed.dependencyStates,
      });

      return {
        run,
        calculation,
      };
    },
  };
}

export const estateDutyService = createEstateDutyService();
