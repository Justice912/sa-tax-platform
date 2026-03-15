import type { CaseStatus, DeadlineRecord } from "@/modules/shared/types";

export interface DeadlineSummary {
  overdue: number;
  dueSoon: number;
  inProgress: number;
  awaitingDocs: number;
  underReview: number;
}

export function classifyDeadline(dueAt: string, caseStatus: CaseStatus, today = new Date()): DeadlineRecord["status"] {
  if (caseStatus === "UNDER_REVIEW") {
    return "UNDER_REVIEW";
  }

  if (caseStatus === "AWAITING_DOCUMENTS") {
    return "AWAITING_DOCS";
  }

  if (caseStatus === "CLOSED" || caseStatus === "SUBMITTED") {
    return "DONE";
  }

  const dueDate = new Date(dueAt);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysDiff = Math.floor((dueDate.getTime() - today.getTime()) / msPerDay);

  if (daysDiff < 0) {
    return "OVERDUE";
  }

  if (daysDiff <= 5) {
    return "DUE_SOON";
  }

  return "IN_PROGRESS";
}

export function buildDeadlineSummary(deadlines: DeadlineRecord[]): DeadlineSummary {
  return deadlines.reduce<DeadlineSummary>(
    (acc, deadline) => {
      if (deadline.status === "OVERDUE") acc.overdue += 1;
      if (deadline.status === "DUE_SOON") acc.dueSoon += 1;
      if (deadline.status === "IN_PROGRESS") acc.inProgress += 1;
      if (deadline.status === "AWAITING_DOCS") acc.awaitingDocs += 1;
      if (deadline.status === "UNDER_REVIEW") acc.underReview += 1;
      return acc;
    },
    {
      overdue: 0,
      dueSoon: 0,
      inProgress: 0,
      awaitingDocs: 0,
      underReview: 0,
    },
  );
}

