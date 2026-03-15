import goldenDemoBundle from "../../desktop/golden-demo-bundle.json";
import { describe, expect, it } from "vitest";
import { demoEstateYearPacks } from "@/server/demo-data";

describe("golden demo valuation baseline", () => {
  it("marks the business valuation template as docx in demo year packs", () => {
    const template2026 = demoEstateYearPacks[0]?.formTemplates.find(
      (template) => template.code === "BUSINESS_VALUATION_REPORT",
    );

    expect(template2026?.outputFormat).toBe("docx");
    expect(template2026?.storageKey).toContain(".docx");
  });

  it("stores the restored golden valuation run with the canonical report sections", () => {
    const businessRun = goldenDemoBundle.estateEngineRuns.find(
      (run) => run.engineType === "BUSINESS_VALUATION",
    );
    const report = businessRun?.outputSnapshot?.report as
      | {
          mandate?: unknown;
          appendices?: unknown;
          glossary?: unknown;
          executiveSummary?: unknown;
        }
      | undefined;

    expect(report?.executiveSummary).toBeDefined();
    expect(report?.mandate).toBeDefined();
    expect(report?.appendices).toBeDefined();
    expect(report?.glossary).toBeDefined();
  });
});
