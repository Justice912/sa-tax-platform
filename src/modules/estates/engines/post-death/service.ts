import { estateEngineService } from "@/modules/estates/engines/service";
import type { CreateEstateEngineRunInput, EstateEngineRunRecord } from "@/modules/estates/engines/types";
import { getLatestApprovedEstateYearPack } from "@/modules/estates/year-packs/service";
import type { EstateYearPackRecord } from "@/modules/estates/year-packs/types";
import type { EstatePostDeathRunInput, EstatePostDeathRunResult } from "@/modules/estates/engines/post-death/types";
import { estatePostDeathRunInputSchema } from "@/modules/estates/engines/post-death/validation";
import { calculateEstatePostDeathTax } from "@/modules/estates/engines/post-death/calculation";

export interface EstatePostDeathServiceDependencies {
  getYearPack?: (taxYear: number) => Promise<EstateYearPackRecord | null>;
  createEngineRun?: (input: CreateEstateEngineRunInput) => Promise<EstateEngineRunRecord>;
}

export function createEstatePostDeathService(
  dependencies: EstatePostDeathServiceDependencies = {},
) {
  const getYearPack = dependencies.getYearPack ?? getLatestApprovedEstateYearPack;
  const createEngineRun =
    dependencies.createEngineRun ??
    ((input: CreateEstateEngineRunInput) => estateEngineService.createRun(input));

  return {
    async createPostDeathRun(input: EstatePostDeathRunInput): Promise<EstatePostDeathRunResult> {
      const parsed = estatePostDeathRunInputSchema.parse(input);
      const yearPack = await getYearPack(parsed.taxYear);

      if (!yearPack) {
        throw new Error(`No approved estate year pack found for tax year ${parsed.taxYear}.`);
      }

      const yearPackId = yearPack.id ?? `estate_year_pack_${yearPack.taxYear}_v${yearPack.version}`;
      const calculation = calculateEstatePostDeathTax({
        rateMode: yearPack.rules.postDeathRateMode ?? "TRUST_RATE",
        trustRate: yearPack.rules.postDeathFlatRate,
        estateRate: yearPack.rules.postDeathEstateRate ?? yearPack.rules.postDeathFlatRate,
        incomeSchedule: parsed.incomeSchedule,
        deductions: parsed.deductions,
        distributedIncome: parsed.distributedIncome,
      });

      const run = await createEngineRun({
        estateId: parsed.estateId,
        yearPackId,
        engineType: "POST_DEATH_IT_AE",
        inputSnapshot: parsed,
        outputSnapshot: {
          calculation,
        },
        warnings: calculation.warnings,
        dependencyStates: [],
      });

      return {
        run,
        calculation,
      };
    },
  };
}

export const estatePostDeathService = createEstatePostDeathService();
