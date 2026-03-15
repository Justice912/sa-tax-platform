import { describe, expect, it } from "vitest";
import { applyITR12Transition, canTransition } from "@/modules/itr12/workflow-service";

describe("itr12 workflow transitions", () => {
  it("allows transition from INTAKE to DATA_COLLECTION", () => {
    expect(canTransition("INTAKE", "DATA_COLLECTION")).toBe(true);
  });

  it("blocks direct transition from INTAKE to READY_FOR_SUBMISSION", () => {
    expect(canTransition("INTAKE", "READY_FOR_SUBMISSION")).toBe(false);
  });

  it("captures transition metadata", () => {
    const result = applyITR12Transition(
      {
        caseId: "case_001",
        fromState: "DATA_COLLECTION",
        toState: "WORKING_PAPERS_PREP",
      },
      {
        actorId: "user_reviewer",
        actorName: "Ayesha Parker",
        summary: "Documents and schedules verified for working papers stage.",
      },
    );

    expect(result.event.actorId).toBe("user_reviewer");
    expect(result.event.summary).toContain("working papers");
    expect(result.event.createdAt).toBeDefined();
  });
});
