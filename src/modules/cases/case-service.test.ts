import { listCases } from "@/modules/cases/case-service";

describe("case demo bundle visibility", () => {
  it("includes the golden demo verification cases", async () => {
    const cases = await listCases();

    expect(cases.some((entry) => entry.id === "golden_case_individual_001")).toBe(true);
    expect(cases.some((entry) => entry.id === "golden_case_estate_001")).toBe(true);
  });
});
