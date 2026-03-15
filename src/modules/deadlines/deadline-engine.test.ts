import { describe, expect, it } from "vitest";
import { buildDeadlineSummary, classifyDeadline } from "@/modules/deadlines/deadline-engine";

describe("deadline engine", () => {
  it("classifies overdue dates", () => {
    const status = classifyDeadline("2026-03-01", "IN_PROGRESS", new Date("2026-03-06"));
    expect(status).toBe("OVERDUE");
  });

  it("classifies under review states regardless of due date", () => {
    const status = classifyDeadline("2030-03-01", "UNDER_REVIEW", new Date("2026-03-06"));
    expect(status).toBe("UNDER_REVIEW");
  });

  it("builds status counts", () => {
    const summary = buildDeadlineSummary([
      { id: "1", caseId: "c1", title: "A", dueAt: "2026-03-01", status: "OVERDUE" },
      { id: "2", caseId: "c2", title: "B", dueAt: "2026-03-10", status: "DUE_SOON" },
      { id: "3", caseId: "c3", title: "C", dueAt: "2026-03-20", status: "UNDER_REVIEW" },
    ]);

    expect(summary).toEqual({
      overdue: 1,
      dueSoon: 1,
      inProgress: 0,
      awaitingDocs: 0,
      underReview: 1,
    });
  });
});

