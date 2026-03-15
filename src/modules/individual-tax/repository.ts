import { isDemoMode } from "@/lib/env";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import type { IndividualTaxAssessmentRecord } from "@/modules/shared/types";
import { demoIndividualTaxAssessments } from "@/server/demo-data";
import type { NearEfilingIndividualTaxInput } from "@/modules/individual-tax/types";

const demoAssessmentsFileName = "demo-individual-tax-assessments.json";

function cloneNearEfilingInput(input?: NearEfilingIndividualTaxInput) {
  if (!input) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(input)) as NearEfilingIndividualTaxInput;
}

function cloneDemoAssessments(
  records: IndividualTaxAssessmentRecord[],
): IndividualTaxAssessmentRecord[] {
  return records.map((record) => ({
    ...record,
    input: { ...record.input },
    nearEfilingInput: cloneNearEfilingInput(record.nearEfilingInput),
  }));
}

function getDemoAssessmentsFilePath() {
  const storageRoot = process.env.STORAGE_ROOT?.trim();
  const basePath = storageRoot ? storageRoot : path.join(process.cwd(), ".storage");
  return path.join(basePath, demoAssessmentsFileName);
}

function readDemoAssessmentsFromDisk() {
  if (process.env.NODE_ENV === "test") {
    return demoIndividualTaxAssessments;
  }

  const filePath = getDemoAssessmentsFilePath();
  const seededRecords = cloneDemoAssessments(demoIndividualTaxAssessments);

  try {
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(seededRecords, null, 2), "utf8");
      return seededRecords;
    }

    const raw = fs.readFileSync(filePath, "utf8").trim();
    if (!raw) {
      fs.writeFileSync(filePath, JSON.stringify(seededRecords, null, 2), "utf8");
      return seededRecords;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      fs.writeFileSync(filePath, JSON.stringify(seededRecords, null, 2), "utf8");
      return seededRecords;
    }

    return parsed as IndividualTaxAssessmentRecord[];
  } catch {
    return seededRecords;
  }
}

function writeDemoAssessmentsToDisk(records: IndividualTaxAssessmentRecord[]) {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const filePath = getDemoAssessmentsFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(records, null, 2), "utf8");
}

export interface CreateIndividualTaxAssessmentInput {
  clientId: string;
  referenceNumber: string;
  taxpayerName: string;
  assessmentDate: string;
  input: {
    assessmentYear: number;
    salaryIncome: number;
    localInterest: number;
    travelAllowance: number;
    retirementContributions: number;
    travelDeduction: number;
    rebates: number;
    medicalTaxCredit: number;
    paye: number;
    priorAssessmentDebitOrCredit: number;
    effectiveTaxRate: number;
  };
}

export interface CreateNearEfilingIndividualTaxAssessmentInput {
  clientId: string;
  referenceNumber: string;
  taxpayerName: string;
  assessmentDate: string;
  input: NearEfilingIndividualTaxInput;
}

export interface IndividualTaxRepository {
  listAssessments(): Promise<IndividualTaxAssessmentRecord[]>;
  getAssessmentById(assessmentId: string): Promise<IndividualTaxAssessmentRecord | null>;
  createAssessment(input: CreateIndividualTaxAssessmentInput): Promise<IndividualTaxAssessmentRecord>;
  createNearEfilingAssessment(
    input: CreateNearEfilingIndividualTaxAssessmentInput,
  ): Promise<IndividualTaxAssessmentRecord>;
  updateAssessmentInput(
    assessmentId: string,
    input: CreateIndividualTaxAssessmentInput["input"],
  ): Promise<IndividualTaxAssessmentRecord>;
  updateNearEfilingAssessmentInput(
    assessmentId: string,
    input: NearEfilingIndividualTaxInput,
  ): Promise<IndividualTaxAssessmentRecord>;
}

class DemoIndividualTaxRepository implements IndividualTaxRepository {
  private mapRow(row: {
    id: string;
    referenceNumber: string;
    taxpayerName: string;
    assessmentDate: Date;
    assessmentYear: number;
    assessmentMode?: "LEGACY_SCAFFOLD" | "NEAR_EFILING_ESTIMATE";
    status: "DRAFT" | "REVIEW_REQUIRED" | "APPROVED";
    profile: {
      clientId: string | null;
    };
    salaryIncome: unknown;
    localInterest: unknown;
    travelAllowance: unknown;
    retirementContributions: unknown;
    travelDeduction: unknown;
    rebates: unknown;
    medicalTaxCredit: unknown;
    paye: unknown;
    priorAssessmentDebitOrCredit: unknown;
    effectiveTaxRate: unknown;
    structuredInput?: unknown;
  }): IndividualTaxAssessmentRecord {
    return {
      id: row.id,
      clientId: row.profile.clientId ?? undefined,
      referenceNumber: row.referenceNumber,
      taxpayerName: row.taxpayerName,
      assessmentDate: row.assessmentDate.toISOString().slice(0, 10),
      assessmentYear: row.assessmentYear,
      assessmentMode: row.assessmentMode ?? "LEGACY_SCAFFOLD",
      status: row.status,
      input: {
        salaryIncome: Number(row.salaryIncome),
        localInterest: Number(row.localInterest),
        travelAllowance: Number(row.travelAllowance),
        retirementContributions: Number(row.retirementContributions),
        travelDeduction: Number(row.travelDeduction),
        rebates: Number(row.rebates),
        medicalTaxCredit: Number(row.medicalTaxCredit),
        paye: Number(row.paye),
        priorAssessmentDebitOrCredit: Number(row.priorAssessmentDebitOrCredit),
        effectiveTaxRate: Number(row.effectiveTaxRate),
      },
      nearEfilingInput: row.structuredInput as NearEfilingIndividualTaxInput | undefined,
    };
  }

  async listAssessments() {
    if (isDemoMode) {
      return readDemoAssessmentsFromDisk();
    }

    const rows = await prisma.individualTaxAssessment.findMany({
      include: { profile: true },
      orderBy: { assessmentDate: "desc" },
    });

    return rows.map<IndividualTaxAssessmentRecord>((row) =>
      this.mapRow({
        ...row,
        status: row.status as "DRAFT" | "REVIEW_REQUIRED" | "APPROVED",
      }),
    );
  }

  async getAssessmentById(assessmentId: string) {
    const rows = await this.listAssessments();
    return rows.find((item) => item.id === assessmentId) ?? null;
  }

  async createAssessment(input: CreateIndividualTaxAssessmentInput) {
    if (!isDemoMode) {
      const assessmentDate = new Date(input.assessmentDate);
      if (Number.isNaN(assessmentDate.getTime())) {
        throw new Error("Invalid assessment date");
      }

      let ruleVersion = await prisma.individualTaxRuleVersion.findFirst({
        where: {
          ruleYear: input.input.assessmentYear,
          isActive: true,
          effectiveFrom: { lte: assessmentDate },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: assessmentDate } }],
        },
        orderBy: { effectiveFrom: "desc" },
      });

      if (!ruleVersion) {
        ruleVersion = await prisma.individualTaxRuleVersion.create({
          data: {
            ruleYear: input.input.assessmentYear,
            versionLabel: `${input.input.assessmentYear}-scaffold-v1`,
            effectiveFrom: new Date(`${input.input.assessmentYear}-03-01`),
            rulesJson: {
              note: "Scaffold placeholder. Replace with production rule package and legal references.",
            },
            isActive: true,
          },
        });
      }

      const profile = await prisma.individualTaxProfile.create({
        data: {
          clientId: input.clientId,
          taxpayerName: input.taxpayerName,
          referenceNumber: input.referenceNumber,
        },
      });

      const created = await prisma.individualTaxAssessment.create({
        data: {
          profileId: profile.id,
          ruleVersionId: ruleVersion.id,
          assessmentYear: input.input.assessmentYear,
          assessmentDate,
          assessmentMode: "LEGACY_SCAFFOLD",
          status: "REVIEW_REQUIRED",
          taxpayerName: input.taxpayerName,
          referenceNumber: input.referenceNumber,
          salaryIncome: input.input.salaryIncome,
          localInterest: input.input.localInterest,
          travelAllowance: input.input.travelAllowance,
          retirementContributions: input.input.retirementContributions,
          travelDeduction: input.input.travelDeduction,
          rebates: input.input.rebates,
          medicalTaxCredit: input.input.medicalTaxCredit,
          paye: input.input.paye,
          priorAssessmentDebitOrCredit: input.input.priorAssessmentDebitOrCredit,
          effectiveTaxRate: input.input.effectiveTaxRate,
        },
        include: { profile: true },
      });

      return this.mapRow({
        ...created,
        status: created.status as "DRAFT" | "REVIEW_REQUIRED" | "APPROVED",
      });
    }

    const created: IndividualTaxAssessmentRecord = {
      id: `itax_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`,
      clientId: input.clientId,
      referenceNumber: input.referenceNumber,
      taxpayerName: input.taxpayerName,
      assessmentDate: input.assessmentDate,
      assessmentYear: input.input.assessmentYear,
      status: "REVIEW_REQUIRED",
      input: {
        salaryIncome: input.input.salaryIncome,
        localInterest: input.input.localInterest,
        travelAllowance: input.input.travelAllowance,
        retirementContributions: input.input.retirementContributions,
        travelDeduction: input.input.travelDeduction,
        rebates: input.input.rebates,
        medicalTaxCredit: input.input.medicalTaxCredit,
        paye: input.input.paye,
        priorAssessmentDebitOrCredit: input.input.priorAssessmentDebitOrCredit,
        effectiveTaxRate: input.input.effectiveTaxRate,
      },
    };

    const records = readDemoAssessmentsFromDisk();
    records.push(created);
    writeDemoAssessmentsToDisk(records);
    return created;
  }

  async createNearEfilingAssessment(input: CreateNearEfilingIndividualTaxAssessmentInput) {
    const derivedAssessmentYear = input.input.profile.assessmentYear;
    const derivedSalaryIncome =
      input.input.employment.salaryIncome +
      input.input.employment.bonusIncome +
      input.input.employment.commissionIncome +
      input.input.employment.fringeBenefits +
      input.input.employment.otherTaxableEmploymentIncome;

    if (!isDemoMode) {
      const assessmentDate = new Date(input.assessmentDate);
      if (Number.isNaN(assessmentDate.getTime())) {
        throw new Error("Invalid assessment date");
      }

      let ruleVersion = await prisma.individualTaxRuleVersion.findFirst({
        where: {
          ruleYear: derivedAssessmentYear,
          isActive: true,
          effectiveFrom: { lte: assessmentDate },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: assessmentDate } }],
        },
        orderBy: { effectiveFrom: "desc" },
      });

      if (!ruleVersion) {
        ruleVersion = await prisma.individualTaxRuleVersion.create({
          data: {
            ruleYear: derivedAssessmentYear,
            versionLabel: `${derivedAssessmentYear}-near-efiling-v1`,
            effectiveFrom: new Date(`${derivedAssessmentYear - 1}-03-01`),
            rulesJson: {
              note: "Near-eFiling estimator rule package placeholder. Confirm against current SARS publications and legislation.",
            },
            isActive: true,
          },
        });
      }

      const profile = await prisma.individualTaxProfile.create({
        data: {
          clientId: input.clientId,
          taxpayerName: input.taxpayerName,
          referenceNumber: input.referenceNumber,
        },
      });

      const created = await prisma.individualTaxAssessment.create({
        data: {
          profileId: profile.id,
          ruleVersionId: ruleVersion.id,
          assessmentYear: derivedAssessmentYear,
          assessmentDate,
          assessmentMode: "NEAR_EFILING_ESTIMATE",
          status: "REVIEW_REQUIRED",
          taxpayerName: input.taxpayerName,
          referenceNumber: input.referenceNumber,
          salaryIncome: derivedSalaryIncome,
          localInterest: input.input.interest.localInterest,
          travelAllowance: input.input.travel.travelAllowance,
          retirementContributions: input.input.deductions.retirementContributions,
          travelDeduction: 0,
          rebates: 0,
          medicalTaxCredit: 0,
          paye: input.input.employment.payeWithheld,
          priorAssessmentDebitOrCredit: input.input.deductions.priorAssessmentDebitOrCredit,
          effectiveTaxRate: 0,
          structuredInput: input.input as unknown as Prisma.InputJsonValue,
        },
        include: { profile: true },
      });

      return this.mapRow({
        ...created,
        status: created.status as "DRAFT" | "REVIEW_REQUIRED" | "APPROVED",
      });
    }

    const created: IndividualTaxAssessmentRecord = {
      id: `itax_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`,
      clientId: input.clientId,
      referenceNumber: input.referenceNumber,
      taxpayerName: input.taxpayerName,
      assessmentDate: input.assessmentDate,
      assessmentYear: derivedAssessmentYear,
      assessmentMode: "NEAR_EFILING_ESTIMATE",
      status: "REVIEW_REQUIRED",
      input: {
        salaryIncome: derivedSalaryIncome,
        localInterest: input.input.interest.localInterest,
        travelAllowance: input.input.travel.travelAllowance,
        retirementContributions: input.input.deductions.retirementContributions,
        travelDeduction: 0,
        rebates: 0,
        medicalTaxCredit: 0,
        paye: input.input.employment.payeWithheld,
        priorAssessmentDebitOrCredit: input.input.deductions.priorAssessmentDebitOrCredit,
        effectiveTaxRate: 0,
      },
      nearEfilingInput: input.input,
    };

    const records = readDemoAssessmentsFromDisk();
    records.push(created);
    writeDemoAssessmentsToDisk(records);
    return created;
  }

  async updateAssessmentInput(
    assessmentId: string,
    input: CreateIndividualTaxAssessmentInput["input"],
  ) {
    if (!isDemoMode) {
      const existing = await prisma.individualTaxAssessment.findUnique({
        where: { id: assessmentId },
      });

      if (!existing) {
        throw new Error("Assessment not found.");
      }

      let ruleVersion = await prisma.individualTaxRuleVersion.findFirst({
        where: {
          ruleYear: input.assessmentYear,
          isActive: true,
        },
        orderBy: { effectiveFrom: "desc" },
      });

      if (!ruleVersion) {
        ruleVersion = await prisma.individualTaxRuleVersion.create({
          data: {
            ruleYear: input.assessmentYear,
            versionLabel: `${input.assessmentYear}-scaffold-v1`,
            effectiveFrom: new Date(`${input.assessmentYear}-03-01`),
            rulesJson: {
              note: "Scaffold placeholder. Replace with production rule package and legal references.",
            },
            isActive: true,
          },
        });
      }

      const updated = await prisma.individualTaxAssessment.update({
        where: { id: assessmentId },
        data: {
          assessmentYear: input.assessmentYear,
          ruleVersionId: ruleVersion.id,
          status: "REVIEW_REQUIRED",
          salaryIncome: input.salaryIncome,
          localInterest: input.localInterest,
          travelAllowance: input.travelAllowance,
          retirementContributions: input.retirementContributions,
          travelDeduction: input.travelDeduction,
          rebates: input.rebates,
          medicalTaxCredit: input.medicalTaxCredit,
          paye: input.paye,
          priorAssessmentDebitOrCredit: input.priorAssessmentDebitOrCredit,
          effectiveTaxRate: input.effectiveTaxRate,
        },
        include: { profile: true },
      });

      return this.mapRow({
        ...updated,
        status: updated.status as "DRAFT" | "REVIEW_REQUIRED" | "APPROVED",
      });
    }

    const records = readDemoAssessmentsFromDisk();
    const assessmentIndex = records.findIndex((entry) => entry.id === assessmentId);
    if (assessmentIndex < 0) {
      throw new Error("Assessment not found.");
    }

    const assessment = records[assessmentIndex];
    assessment.assessmentYear = input.assessmentYear;
    assessment.status = "REVIEW_REQUIRED";
    assessment.input = {
      salaryIncome: input.salaryIncome,
      localInterest: input.localInterest,
      travelAllowance: input.travelAllowance,
      retirementContributions: input.retirementContributions,
      travelDeduction: input.travelDeduction,
      rebates: input.rebates,
      medicalTaxCredit: input.medicalTaxCredit,
      paye: input.paye,
      priorAssessmentDebitOrCredit: input.priorAssessmentDebitOrCredit,
      effectiveTaxRate: input.effectiveTaxRate,
    };

    writeDemoAssessmentsToDisk(records);
    return assessment;
  }

  async updateNearEfilingAssessmentInput(
    assessmentId: string,
    input: NearEfilingIndividualTaxInput,
  ) {
    const derivedSalaryIncome =
      input.employment.salaryIncome +
      input.employment.bonusIncome +
      input.employment.commissionIncome +
      input.employment.fringeBenefits +
      input.employment.otherTaxableEmploymentIncome;

    if (!isDemoMode) {
      const existing = await prisma.individualTaxAssessment.findUnique({
        where: { id: assessmentId },
      });

      if (!existing) {
        throw new Error("Assessment not found.");
      }

      let ruleVersion = await prisma.individualTaxRuleVersion.findFirst({
        where: {
          ruleYear: input.profile.assessmentYear,
          isActive: true,
        },
        orderBy: { effectiveFrom: "desc" },
      });

      if (!ruleVersion) {
        ruleVersion = await prisma.individualTaxRuleVersion.create({
          data: {
            ruleYear: input.profile.assessmentYear,
            versionLabel: `${input.profile.assessmentYear}-near-efiling-v1`,
            effectiveFrom: new Date(`${input.profile.assessmentYear - 1}-03-01`),
            rulesJson: {
              note: "Near-eFiling estimator rule package placeholder. Confirm against current SARS publications and legislation.",
            },
            isActive: true,
          },
        });
      }

      const updated = await prisma.individualTaxAssessment.update({
        where: { id: assessmentId },
        data: {
          assessmentYear: input.profile.assessmentYear,
          ruleVersionId: ruleVersion.id,
          assessmentMode: "NEAR_EFILING_ESTIMATE",
          status: "REVIEW_REQUIRED",
          salaryIncome: derivedSalaryIncome,
          localInterest: input.interest.localInterest,
          travelAllowance: input.travel.travelAllowance,
          retirementContributions: input.deductions.retirementContributions,
          travelDeduction: 0,
          rebates: 0,
          medicalTaxCredit: 0,
          paye: input.employment.payeWithheld,
          priorAssessmentDebitOrCredit: input.deductions.priorAssessmentDebitOrCredit,
          effectiveTaxRate: 0,
          structuredInput: input as unknown as Prisma.InputJsonValue,
        },
        include: { profile: true },
      });

      return this.mapRow({
        ...updated,
        status: updated.status as "DRAFT" | "REVIEW_REQUIRED" | "APPROVED",
      });
    }

    const records = readDemoAssessmentsFromDisk();
    const assessmentIndex = records.findIndex((entry) => entry.id === assessmentId);
    if (assessmentIndex < 0) {
      throw new Error("Assessment not found.");
    }

    const assessment = records[assessmentIndex];
    assessment.assessmentYear = input.profile.assessmentYear;
    assessment.assessmentMode = "NEAR_EFILING_ESTIMATE";
    assessment.status = "REVIEW_REQUIRED";
    assessment.input = {
      salaryIncome: derivedSalaryIncome,
      localInterest: input.interest.localInterest,
      travelAllowance: input.travel.travelAllowance,
      retirementContributions: input.deductions.retirementContributions,
      travelDeduction: 0,
      rebates: 0,
      medicalTaxCredit: 0,
      paye: input.employment.payeWithheld,
      priorAssessmentDebitOrCredit: input.deductions.priorAssessmentDebitOrCredit,
      effectiveTaxRate: 0,
    };
    assessment.nearEfilingInput = input;

    writeDemoAssessmentsToDisk(records);
    return assessment;
  }
}

export const individualTaxRepository: IndividualTaxRepository = new DemoIndividualTaxRepository();
