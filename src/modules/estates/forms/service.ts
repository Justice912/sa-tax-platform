import { listEstateEngineRuns } from "@/modules/estates/engines/repository";
import type { EstateEngineRunRecord } from "@/modules/estates/engines/types";
import { getEstateById } from "@/modules/estates/service";
import { mapEstateFormFields } from "@/modules/estates/forms/field-mapper";
import type {
  EstateFilingPackArtifact,
  EstateFilingPackInput,
  EstateFilingPackManifest,
  EstateFilingPackRequiredEngine,
  EstateResolvedTemplate,
} from "@/modules/estates/forms/types";
import type { EstateDetailRecord } from "@/modules/estates/types";
import { getLatestApprovedEstateYearPack } from "@/modules/estates/year-packs/service";
import {
  ESTATE_YEAR_PACK_FORM_CODE_VALUES,
  type EstateYearPackFormCode,
  type EstateYearPackRecord,
} from "@/modules/estates/year-packs/types";

export interface EstateFilingPackServiceDependencies {
  getEstate?: (estateId: string) => Promise<EstateDetailRecord | null>;
  getYearPack?: (taxYear: number) => Promise<EstateYearPackRecord | null>;
  listRuns?: (estateId: string) => Promise<EstateEngineRunRecord[]>;
  now?: () => string;
}

function resolveTemplate(
  yearPack: EstateYearPackRecord,
  code: EstateYearPackFormCode,
): EstateResolvedTemplate {
  const template = yearPack.formTemplates.find((entry) => entry.code === code);
  if (!template) {
    throw new Error(`Estate year pack ${yearPack.taxYear} v${yearPack.version} is missing template ${code}.`);
  }

  return template;
}

function selectLatestApprovedRun(
  runs: EstateEngineRunRecord[],
  engineType: EstateFilingPackRequiredEngine,
  yearPackId: string,
) {
  return runs
    .filter(
      (run) =>
        run.engineType === engineType &&
        run.yearPackId === yearPackId &&
        run.status === "APPROVED" &&
        run.reviewRequired === false,
    )
    .sort((left, right) =>
      (right.approvedAt ?? right.updatedAt).localeCompare(left.approvedAt ?? left.updatedAt),
    )[0];
}

function buildRunPayloadContext(
  runs: Partial<Record<EstateFilingPackRequiredEngine, EstateEngineRunRecord>>,
) {
  return Object.fromEntries(
    Object.entries(runs)
      .filter((entry): entry is [EstateFilingPackRequiredEngine, EstateEngineRunRecord] =>
        Boolean(entry[1]),
      )
      .map(([engineType, run]) => [engineType, run.outputSnapshot]),
  );
}

const REQUIRED_ENGINES_BY_FORM_CODE: Record<
  EstateYearPackFormCode,
  readonly EstateFilingPackRequiredEngine[]
> = {
  BUSINESS_VALUATION_REPORT: ["BUSINESS_VALUATION"],
  SARS_ITR12: ["PRE_DEATH_ITR12"],
  SARS_CGT_DEATH: ["CGT_ON_DEATH"],
  SARS_REV267: ["ESTATE_DUTY"],
  SARS_IT_AE: ["POST_DEATH_IT_AE"],
  MASTER_LD_ACCOUNT: ["ESTATE_DUTY"],
  SARS_J190: ["ESTATE_DUTY"],
  SARS_J192: ["ESTATE_DUTY"],
  SARS_J243: [],
  SARS_REV246: ["ESTATE_DUTY"],
};

function sourceRunIdForCode(
  code: EstateYearPackFormCode,
  approvedRuns: Partial<Record<EstateFilingPackRequiredEngine, EstateEngineRunRecord>>,
) {
  switch (code) {
    case "BUSINESS_VALUATION_REPORT":
      return approvedRuns.BUSINESS_VALUATION?.id;
    case "SARS_ITR12":
      return approvedRuns.PRE_DEATH_ITR12?.id;
    case "SARS_CGT_DEATH":
      return approvedRuns.CGT_ON_DEATH?.id;
    case "SARS_REV267":
    case "MASTER_LD_ACCOUNT":
    case "SARS_J190":
    case "SARS_J192":
    case "SARS_REV246":
      return approvedRuns.ESTATE_DUTY?.id;
    case "SARS_IT_AE":
      return approvedRuns.POST_DEATH_IT_AE?.id;
    case "SARS_J243":
      return undefined;
  }
}

export function createEstateFilingPackService(
  dependencies: EstateFilingPackServiceDependencies = {},
) {
  const getEstate = dependencies.getEstate ?? getEstateById;
  const getYearPack = dependencies.getYearPack ?? getLatestApprovedEstateYearPack;
  const listRuns = dependencies.listRuns ?? listEstateEngineRuns;
  const now = dependencies.now ?? (() => new Date().toISOString());

  async function generateManifestForCodes(
    input: EstateFilingPackInput,
    codes: readonly EstateYearPackFormCode[],
  ): Promise<EstateFilingPackManifest> {
    const estate = await getEstate(input.estateId);
    if (!estate) {
      throw new Error("Estate not found.");
    }

    const yearPack = await getYearPack(input.taxYear);
    if (!yearPack || !yearPack.id) {
      throw new Error(`No approved estate year pack found for tax year ${input.taxYear}.`);
    }

    const runs = await listRuns(estate.id);
    const approvedRuns: Partial<Record<EstateFilingPackRequiredEngine, EstateEngineRunRecord>> = {};
    const requiredEngines = new Set<EstateFilingPackRequiredEngine>();
    for (const code of codes) {
      for (const engineType of REQUIRED_ENGINES_BY_FORM_CODE[code]) {
        requiredEngines.add(engineType);
      }
    }

    const missingEngines: EstateFilingPackRequiredEngine[] = [];
    for (const engineType of requiredEngines) {
      const run = selectLatestApprovedRun(runs, engineType, yearPack.id);
      if (!run) {
        missingEngines.push(engineType);
        continue;
      }

      approvedRuns[engineType] = run;
    }

    if (missingEngines.length > 0) {
      throw new Error(
        `Filing pack generation requires approved estate engine runs for ${missingEngines.join(", ")}.`,
      );
    }

    const context = {
      estate,
      taxYear: input.taxYear,
      yearPack: {
        id: yearPack.id,
        taxYear: yearPack.taxYear,
        version: yearPack.version,
        sourceReference: yearPack.sourceReference,
      },
      runs: buildRunPayloadContext(approvedRuns),
    };

    const artifacts: EstateFilingPackArtifact[] = codes.map((code) => {
      const template = resolveTemplate(yearPack, code);

      return {
        code,
        title: template.metadata.title,
        jurisdiction: template.metadata.jurisdiction,
        outputFormat: template.outputFormat,
        templateVersion: template.templateVersion,
        templateStorageKey: template.storageKey,
        status: "READY",
        payload: mapEstateFormFields(code, context),
        sourceRunId: sourceRunIdForCode(code, approvedRuns),
      };
    });

    return {
      estateId: estate.id,
      estateReference: estate.estateReference,
      taxYear: input.taxYear,
      yearPackId: yearPack.id,
      yearPackVersion: yearPack.version,
      generatedAt: now(),
      artifacts,
    };
  }

  return {
    async generateFilingPackManifest(
      input: EstateFilingPackInput,
    ): Promise<EstateFilingPackManifest> {
      return generateManifestForCodes(input, ESTATE_YEAR_PACK_FORM_CODE_VALUES);
    },

    async generateArtifactManifest(
      input: EstateFilingPackInput & { code: EstateYearPackFormCode },
    ): Promise<EstateFilingPackManifest> {
      return generateManifestForCodes(input, [input.code]);
    },
  };
}

export const estateFilingPackService = createEstateFilingPackService();
