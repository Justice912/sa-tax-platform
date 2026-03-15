import {
  calculateIndividualTax2026,
  calculateNearEfilingIndividualTaxEstimate,
} from "@/modules/individual-tax/calculation-service";
import { buildIndividualTaxReport } from "@/modules/individual-tax/report-transformer";
import { individualTaxRepository } from "@/modules/individual-tax/repository";
import {
  individualTaxInputSchema,
  nearEfilingIndividualTaxInputSchema,
} from "@/modules/individual-tax/validation";
import type { IndividualTaxInput, NearEfilingIndividualTaxInput } from "@/modules/individual-tax/types";
import { writeAuditLog } from "@/modules/audit/audit-writer";
import { getClientById } from "@/modules/clients/client-service";

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

export interface CreateIndividualTaxAssessmentForClientInput {
  clientId: string;
  referenceNumber: string;
  taxpayerName: string;
  assessmentDate: string;
  input: IndividualTaxInput;
}

export interface CreateNearEfilingEstimateForClientInput {
  clientId: string;
  referenceNumber: string;
  taxpayerName: string;
  assessmentDate: string;
  input: NearEfilingIndividualTaxInput;
}

export async function listIndividualTaxAssessments() {
  return individualTaxRepository.listAssessments();
}

export async function listIndividualTaxAssessmentsByClient(clientId: string) {
  const assessments = await individualTaxRepository.listAssessments();
  return assessments.filter((assessment) => assessment.clientId === clientId);
}

export async function createIndividualTaxAssessmentForClient(
  input: CreateIndividualTaxAssessmentForClientInput,
) {
  if (!isoDateRegex.test(input.assessmentDate)) {
    throw new Error("Assessment date must be in YYYY-MM-DD format.");
  }

  const parsedInput = individualTaxInputSchema.parse(input.input);

  const created = await individualTaxRepository.createAssessment({
    clientId: input.clientId,
    referenceNumber: input.referenceNumber,
    taxpayerName: input.taxpayerName,
    assessmentDate: input.assessmentDate,
    input: parsedInput,
  });

  await writeAuditLog({
    action: "INDIVIDUAL_TAX_ASSESSMENT_CREATED",
    entityType: "IndividualTaxAssessment",
    entityId: created.id,
    summary: `Created individual tax assessment for ${created.taxpayerName}.`,
    afterData: {
      clientId: created.clientId,
      assessmentYear: created.assessmentYear,
      referenceNumber: created.referenceNumber,
    },
  });

  return created;
}

export async function createNearEfilingEstimateForClient(
  input: CreateNearEfilingEstimateForClientInput,
) {
  if (!isoDateRegex.test(input.assessmentDate)) {
    throw new Error("Assessment date must be in YYYY-MM-DD format.");
  }

  const parsedInput = nearEfilingIndividualTaxInputSchema.parse(input.input);

  const created = await individualTaxRepository.createNearEfilingAssessment({
    clientId: input.clientId,
    referenceNumber: input.referenceNumber,
    taxpayerName: input.taxpayerName,
    assessmentDate: input.assessmentDate,
    input: parsedInput,
  });

  await writeAuditLog({
    action: "INDIVIDUAL_TAX_NEAR_EFILING_ESTIMATE_CREATED",
    entityType: "IndividualTaxAssessment",
    entityId: created.id,
    summary: `Created near-eFiling estimate for ${created.taxpayerName}.`,
    afterData: {
      clientId: created.clientId,
      assessmentYear: created.assessmentYear,
      referenceNumber: created.referenceNumber,
      assessmentMode: created.assessmentMode,
    },
  });

  return created;
}

export async function updateIndividualTaxAssessmentInput(
  assessmentId: string,
  input: IndividualTaxInput,
) {
  const existing = await individualTaxRepository.getAssessmentById(assessmentId);
  if (!existing) {
    throw new Error("Assessment not found.");
  }

  const parsedInput = individualTaxInputSchema.parse(input);
  const updated = await individualTaxRepository.updateAssessmentInput(
    assessmentId,
    parsedInput,
  );

  await writeAuditLog({
    action: "INDIVIDUAL_TAX_ASSESSMENT_UPDATED",
    entityType: "IndividualTaxAssessment",
    entityId: assessmentId,
    summary: `Updated individual tax assessment for ${updated.taxpayerName}.`,
    beforeData: {
      assessmentYear: existing.assessmentYear,
      salaryIncome: existing.input.salaryIncome,
      paye: existing.input.paye,
      effectiveTaxRate: existing.input.effectiveTaxRate,
    },
    afterData: {
      assessmentYear: updated.assessmentYear,
      salaryIncome: updated.input.salaryIncome,
      paye: updated.input.paye,
      effectiveTaxRate: updated.input.effectiveTaxRate,
    },
  });

  return updated;
}

export async function updateNearEfilingEstimateInput(
  assessmentId: string,
  input: NearEfilingIndividualTaxInput,
) {
  const existing = await individualTaxRepository.getAssessmentById(assessmentId);
  if (!existing) {
    throw new Error("Assessment not found.");
  }

  const parsedInput = nearEfilingIndividualTaxInputSchema.parse(input);
  const updated = await individualTaxRepository.updateNearEfilingAssessmentInput(
    assessmentId,
    parsedInput,
  );

  await writeAuditLog({
    action: "INDIVIDUAL_TAX_NEAR_EFILING_ESTIMATE_UPDATED",
    entityType: "IndividualTaxAssessment",
    entityId: assessmentId,
    summary: `Updated near-eFiling estimate for ${updated.taxpayerName}.`,
    beforeData: {
      assessmentYear: existing.assessmentYear,
      assessmentMode: existing.assessmentMode,
    },
    afterData: {
      assessmentYear: updated.assessmentYear,
      assessmentMode: updated.assessmentMode,
    },
  });

  return updated;
}

export function calculateLegacyIndividualTaxAssessment(input: IndividualTaxInput) {
  const parsedInput = individualTaxInputSchema.parse(input);
  return calculateIndividualTax2026(parsedInput);
}

export function calculateNearEfilingEstimate(input: NearEfilingIndividualTaxInput) {
  const parsedInput = nearEfilingIndividualTaxInputSchema.parse(input);
  return calculateNearEfilingIndividualTaxEstimate(parsedInput);
}

export async function getIndividualTaxAssessmentResult(assessmentId: string) {
  const assessment = await individualTaxRepository.getAssessmentById(assessmentId);
  if (!assessment) {
    return null;
  }

  const calc =
    assessment.assessmentMode === "NEAR_EFILING_ESTIMATE" && assessment.nearEfilingInput
      ? calculateNearEfilingEstimate(assessment.nearEfilingInput)
      : calculateLegacyIndividualTaxAssessment({
          assessmentYear: assessment.assessmentYear,
          ...assessment.input,
        });

  return {
    assessment,
    calc,
  };
}

export async function getIndividualTaxReportData(assessmentId: string) {
  const result = await getIndividualTaxAssessmentResult(assessmentId);
  if (!result) {
    return null;
  }

  const linkedClient = result.assessment.clientId
    ? await getClientById(result.assessment.clientId)
    : null;

  const report = buildIndividualTaxReport({
    referenceNumber: result.assessment.referenceNumber,
    taxpayerName: result.assessment.taxpayerName,
    taxpayerAddress: linkedClient?.address,
    assessmentDate: result.assessment.assessmentDate,
    calc: result.calc,
  });

  return {
    assessment: result.assessment,
    calc: result.calc,
    report,
  };
}
