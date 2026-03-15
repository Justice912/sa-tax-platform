import { estateEngineService } from "@/modules/estates/engines/service";
import type { CreateEstateEngineRunInput, EstateEngineRunRecord } from "@/modules/estates/engines/types";
import { getEstateById } from "@/modules/estates/service";
import { getLatestApprovedEstateYearPack } from "@/modules/estates/year-packs/service";
import type { EstateDetailRecord } from "@/modules/estates/types";
import type { EstateYearPackRecord } from "@/modules/estates/year-packs/types";
import type { EstateCgtRunInput, EstateCgtRunResult } from "@/modules/estates/engines/cgt/types";
import { estateCgtRunInputSchema } from "@/modules/estates/engines/cgt/validation";
import { calculateEstateCgtOnDeath } from "@/modules/estates/engines/cgt/calculation";

function computeAgeAtDate(dateOfBirth: string, referenceDate: string): number {
  const birth = new Date(`${dateOfBirth}T00:00:00`);
  const ref = new Date(`${referenceDate}T00:00:00`);
  let age = ref.getFullYear() - birth.getFullYear();
  const monthDiff = ref.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export interface EstateCgtServiceDependencies {
  getEstate?: (estateId: string) => Promise<EstateDetailRecord | null>;
  getYearPack?: (taxYear: number) => Promise<EstateYearPackRecord | null>;
  createEngineRun?: (input: CreateEstateEngineRunInput) => Promise<EstateEngineRunRecord>;
}

export function createEstateCgtService(
  dependencies: EstateCgtServiceDependencies = {},
) {
  const getEstate = dependencies.getEstate ?? getEstateById;
  const getYearPack = dependencies.getYearPack ?? getLatestApprovedEstateYearPack;
  const createEngineRun =
    dependencies.createEngineRun ??
    ((input: CreateEstateEngineRunInput) => estateEngineService.createRun(input));

  return {
    async createCgtRun(input: EstateCgtRunInput): Promise<EstateCgtRunResult> {
      const parsed = estateCgtRunInputSchema.parse(input);
      const estate = await getEstate(parsed.estateId);

      if (!estate) {
        throw new Error("Estate not found.");
      }

      const yearPack = await getYearPack(parsed.taxYear);
      if (!yearPack) {
        throw new Error(`No approved estate year pack found for tax year ${parsed.taxYear}.`);
      }

      const yearPackId = yearPack.id ?? `estate_year_pack_${yearPack.taxYear}_v${yearPack.version}`;
      const cgtEligibleAssets = estate.assets.filter(
        (asset) => !asset.isPersonalUse,
      );

      const deceasedAge = estate.dateOfBirth
        ? computeAgeAtDate(estate.dateOfBirth, estate.dateOfDeath)
        : undefined;

      const calculation = calculateEstateCgtOnDeath({
        inclusionRate: yearPack.rules.cgtInclusionRate,
        annualExclusionOnDeath: yearPack.rules.cgtAnnualExclusionOnDeath,
        primaryResidenceExclusion: yearPack.rules.cgtPrimaryResidenceExclusion,
        smallBusinessExclusion: yearPack.rules.cgtSmallBusinessExclusion,
        deceasedAge,
        assets: cgtEligibleAssets.map((asset) => ({
          description: asset.description,
          dateOfDeathValue: asset.dateOfDeathValue,
          baseCost: asset.baseCost,
          acquisitionDate: asset.acquisitionDate,
          valuationDateValue: asset.valuationDateValue,
          isPrimaryResidence: asset.isPrimaryResidence,
          spouseRollover: asset.spouseRollover,
          isSmallBusinessAsset: asset.category === "BUSINESS_INTEREST",
        })),
      });

      const run = await createEngineRun({
        estateId: estate.id,
        yearPackId,
        engineType: "CGT_ON_DEATH",
        inputSnapshot: {
          taxYear: parsed.taxYear,
          assets: estate.assets,
        },
        outputSnapshot: {
          calculation,
        },
        warnings: calculation.warnings,
        dependencyStates: [],
      });

      return {
        run,
        calculation,
        sourceEstate: {
          id: estate.id,
          dateOfDeath: estate.dateOfDeath,
          estateReference: estate.estateReference,
        },
      };
    },
  };
}

export const estateCgtService = createEstateCgtService();
