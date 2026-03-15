import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isDemoMode } from "@/lib/env";
import {
  demoITR12CalculationInputs,
  demoITR12Transitions,
  demoITR12Workpapers,
  demoITR12Workspaces,
} from "@/server/demo-data";
import type {
  ITR12CalculationInput,
  ITR12CalculationOutput,
  ITR12TransitionEvent,
  ITR12WorkpaperRecord,
  ITR12WorkspaceRecord,
} from "@/modules/itr12/types";

export interface ITR12Repository {
  listWorkspaces(): Promise<ITR12WorkspaceRecord[]>;
  getWorkspaceByCaseId(caseId: string): Promise<ITR12WorkspaceRecord | null>;
  listTransitions(caseId: string): Promise<ITR12TransitionEvent[]>;
  listWorkpapers(caseId: string): Promise<ITR12WorkpaperRecord[]>;
  getCalculationInput(caseId: string): Promise<ITR12CalculationInput | null>;
  saveCalculationInput(
    caseId: string,
    input: ITR12CalculationInput,
    output: ITR12CalculationOutput,
  ): Promise<void>;
}

class DemoITR12Repository implements ITR12Repository {
  async listWorkspaces() {
    if (!isDemoMode) {
      const rows = await prisma.iTR12Profile.findMany({
        include: {
          case: {
            include: {
              client: true,
              assignedUser: true,
              reviewStatus: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      return rows.map<ITR12WorkspaceRecord>((entry) => ({
        caseId: entry.caseId,
        title: `${entry.case.title} (ITR12 Workspace)`,
        clientName: entry.case.client.displayName,
        workflowState: entry.workflowState,
        reviewState: entry.case.reviewStatus.code as
          | "REVIEW_REQUIRED"
          | "INTERNAL_REVIEW"
          | "APPROVED",
        assessmentYear: entry.assessmentYear,
        periodStart: entry.periodStart.toISOString().slice(0, 10),
        periodEnd: entry.periodEnd.toISOString().slice(0, 10),
        dueDate: entry.case.dueDate
          ? entry.case.dueDate.toISOString().slice(0, 10)
          : "-",
        assignedUserName: entry.case.assignedUser?.fullName ?? "Unassigned",
        assumptions: Array.isArray(entry.assumptions)
          ? (entry.assumptions as string[])
          : [],
      }));
    }

    return demoITR12Workspaces;
  }

  async getWorkspaceByCaseId(caseId: string) {
    const rows = await this.listWorkspaces();
    return rows.find((entry) => entry.caseId === caseId) ?? null;
  }

  async listTransitions(caseId: string) {
    if (!isDemoMode) {
      const profile = await prisma.iTR12Profile.findUnique({
        where: { caseId },
        include: { case: true },
      });

      if (!profile) {
        return [];
      }

      return [
        {
          id: `itr12_prisma_evt_${profile.id}`,
          caseId,
          fromState: "INTAKE" as const,
          toState: profile.workflowState as ITR12TransitionEvent["toState"],
          actorId: profile.case.createdById,
          actorName: "System / Migration Placeholder",
          summary:
            "ITR12 transition events are scaffolded. Detailed transition logs can be persisted in next iteration.",
          createdAt: profile.updatedAt.toISOString(),
        } satisfies ITR12TransitionEvent,
      ];
    }

    return demoITR12Transitions
      .filter((event) => event.caseId === caseId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async listWorkpapers(caseId: string) {
    if (!isDemoMode) {
      const rows = await prisma.iTR12Workpaper.findMany({
        where: { caseId },
        orderBy: { updatedAt: "desc" },
      });

      return rows.map<ITR12WorkpaperRecord>((workpaper) => ({
        id: workpaper.id,
        caseId: workpaper.caseId,
        code: workpaper.code,
        title: workpaper.title,
        status: workpaper.status,
        sourceReference: workpaper.sourceReference,
        notes: workpaper.notes ?? undefined,
        updatedAt: workpaper.updatedAt.toISOString(),
      }));
    }

    return demoITR12Workpapers.filter((workpaper) => workpaper.caseId === caseId);
  }

  async getCalculationInput(caseId: string) {
    if (!isDemoMode) {
      const latestRun = await prisma.iTR12CalculationRun.findFirst({
        where: { caseId },
        orderBy: { ranAt: "desc" },
      });

      if (!latestRun) {
        return null;
      }

      const summary = (latestRun.summary ?? {}) as {
        input?: ITR12CalculationInput;
        taxableIncome?: number;
        totalCredits?: number;
      };

      if (summary.input) {
        return summary.input;
      }

      return {
        assessmentYear: latestRun.assessmentYear,
        employmentIncome: summary.taxableIncome ?? 0,
        otherIncome: 0,
        deductionsExcludingRetirement: 0,
        retirementContribution: 0,
        retirementContributionCap: 0,
        payeWithheld: summary.totalCredits ?? 0,
        provisionalPayments: 0,
        medicalTaxCredit: 0,
        estimatedTaxRate: 0.3,
      };
    }

    return demoITR12CalculationInputs[caseId] ?? null;
  }

  async saveCalculationInput(
    caseId: string,
    input: ITR12CalculationInput,
    output: ITR12CalculationOutput,
  ) {
    if (isDemoMode) {
      demoITR12CalculationInputs[caseId] = input;
      return;
    }

    const uniqueAssumptions = Array.from(
      new Set(output.lineItems.flatMap((lineItem) => lineItem.assumptions)),
    );
    const inputSnapshot: Prisma.InputJsonObject = {
      assessmentYear: input.assessmentYear,
      employmentIncome: input.employmentIncome,
      otherIncome: input.otherIncome,
      deductionsExcludingRetirement: input.deductionsExcludingRetirement,
      retirementContribution: input.retirementContribution,
      retirementContributionCap: input.retirementContributionCap,
      payeWithheld: input.payeWithheld,
      provisionalPayments: input.provisionalPayments,
      medicalTaxCredit: input.medicalTaxCredit,
      estimatedTaxRate: input.estimatedTaxRate,
    };
    const summary: Prisma.InputJsonObject = {
      input: inputSnapshot,
      taxableIncome: output.summary.taxableIncome,
      totalCredits: output.summary.totalCredits,
      netPayableOrRefund: output.summary.netPayableOrRefund,
    };

    await prisma.iTR12CalculationRun.create({
      data: {
        caseId,
        assessmentYear: input.assessmentYear,
        status: "REVIEW_REQUIRED",
        reviewRequired: true,
        summary,
        legalDisclaimer: output.legalDisclaimer,
        lineItems: {
          create: output.lineItems.map((line) => ({
            lineCode: line.lineCode,
            label: line.label,
            amount: line.amount,
            working: line.working,
            assumptions: line.assumptions,
            sourceReference: line.sourceReference,
            reviewRequired: line.reviewRequired,
          })),
        },
        assumptions: {
          create: uniqueAssumptions.map((assumption) => ({
            assumption,
            sourceReference:
              "Generated from ITR12 interactive input save. Review required before filing.",
          })),
        },
      },
    });
  }
}

export const itr12Repository: ITR12Repository = new DemoITR12Repository();
