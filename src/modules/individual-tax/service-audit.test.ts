import {
  createIndividualTaxAssessmentForClient,
  updateIndividualTaxAssessmentInput,
} from "@/modules/individual-tax/service";
import { listAuditLogsForEntities } from "@/modules/audit/audit-service";
import { demoAuditLogs, demoIndividualTaxAssessments } from "@/server/demo-data";

describe("individual tax audit integration", () => {
  it("writes audit entries when creating and updating an assessment", async () => {
    const auditSnapshot = [...demoAuditLogs];

    const created = await createIndividualTaxAssessmentForClient({
      clientId: "client_001",
      referenceNumber: "AUDIT-ITAX-001",
      taxpayerName: "Audit Taxpayer",
      assessmentDate: "2026-03-09",
      input: {
        assessmentYear: 2026,
        salaryIncome: 400000,
        localInterest: 800,
        travelAllowance: 30000,
        retirementContributions: 9000,
        travelDeduction: 3000,
        rebates: 17235,
        medicalTaxCredit: 4000,
        paye: 70000,
        priorAssessmentDebitOrCredit: 0,
        effectiveTaxRate: 0.25,
      },
    });

    await updateIndividualTaxAssessmentInput(created.id, {
      assessmentYear: 2026,
      salaryIncome: 650000,
      localInterest: 1000,
      travelAllowance: 50000,
      retirementContributions: 12000,
      travelDeduction: 7000,
      rebates: 17235,
      medicalTaxCredit: 6000,
      paye: 130000,
      priorAssessmentDebitOrCredit: 0,
      effectiveTaxRate: 0.27,
    });

    const logs = await listAuditLogsForEntities(
      [{ entityType: "IndividualTaxAssessment", entityId: created.id }],
      10,
    );

    expect(
      logs.some((entry) => entry.action === "INDIVIDUAL_TAX_ASSESSMENT_CREATED"),
    ).toBe(true);
    expect(
      logs.some((entry) => entry.action === "INDIVIDUAL_TAX_ASSESSMENT_UPDATED"),
    ).toBe(true);

    const index = demoIndividualTaxAssessments.findIndex((entry) => entry.id === created.id);
    if (index >= 0) {
      demoIndividualTaxAssessments.splice(index, 1);
    }
    demoAuditLogs.length = 0;
    demoAuditLogs.push(...auditSnapshot);
  });
});

