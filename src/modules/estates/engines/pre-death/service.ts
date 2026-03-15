import { calculateNearEfilingEstimate } from "@/modules/individual-tax/service";
import type { CreateEstateEngineRunInput, EstateEngineRunRecord } from "@/modules/estates/engines/types";
import { estateEngineService } from "@/modules/estates/engines/service";
import { getEstateById } from "@/modules/estates/service";
import { getLatestApprovedEstateYearPack } from "@/modules/estates/year-packs/service";
import type { EstateDetailRecord } from "@/modules/estates/types";
import type { EstateYearPackRecord } from "@/modules/estates/year-packs/types";
import type { EstatePreDeathRunInput, EstatePreDeathRunResult } from "@/modules/estates/engines/pre-death/types";
import { estatePreDeathRunInputSchema } from "@/modules/estates/engines/pre-death/validation";
import { buildEstatePreDeathNearEfilingInput } from "@/modules/estates/engines/pre-death/transformer";

export interface EstatePreDeathServiceDependencies {
  getEstate?: (estateId: string) => Promise<EstateDetailRecord | null>;
  getYearPack?: (taxYear: number) => Promise<EstateYearPackRecord | null>;
  createEngineRun?: (input: CreateEstateEngineRunInput) => Promise<EstateEngineRunRecord>;
}

export function createEstatePreDeathService(
  dependencies: EstatePreDeathServiceDependencies = {},
) {
  const getEstate = dependencies.getEstate ?? getEstateById;
  const getYearPack = dependencies.getYearPack ?? getLatestApprovedEstateYearPack;
  const createEngineRun =
    dependencies.createEngineRun ??
    ((input: CreateEstateEngineRunInput) => estateEngineService.createRun(input));

  return {
    async createPreDeathRun(input: EstatePreDeathRunInput): Promise<EstatePreDeathRunResult> {
      const parsed = estatePreDeathRunInputSchema.parse(input);
      const estate = await getEstate(parsed.estateId);

      if (!estate) {
        throw new Error("Estate not found.");
      }

      const yearPack = await getYearPack(parsed.taxYear);
      if (!yearPack) {
        throw new Error(`No approved estate year pack found for tax year ${parsed.taxYear}.`);
      }

      const yearPackId = yearPack.id ?? `estate_year_pack_${yearPack.taxYear}_v${yearPack.version}`;
      const transformedInput = buildEstatePreDeathNearEfilingInput(
        {
          estate,
          yearPackId,
        },
        parsed,
      );

      const calculation = calculateNearEfilingEstimate(transformedInput);
      const warnings = [...(calculation.warnings ?? [])];
      if (parsed.cgtTaxableCapitalGain === undefined || parsed.cgtTaxableCapitalGain === null) {
        warnings.push("No CGT on death included. Run the CGT engine first for a complete ITR12.");
      }
      const run = await createEngineRun({
        estateId: estate.id,
        yearPackId,
        engineType: "PRE_DEATH_ITR12",
        inputSnapshot: parsed,
        outputSnapshot: {
          transformedInput,
          calculation,
        },
        warnings,
        dependencyStates: [],
      });

      return {
        run,
        transformedInput,
        calculation,
      };
    },
  };
}

export const estatePreDeathService = createEstatePreDeathService();
