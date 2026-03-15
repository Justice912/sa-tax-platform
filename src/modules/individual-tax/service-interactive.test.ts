import {
  createIndividualTaxAssessmentForClient,
  createNearEfilingEstimateForClient,
  getIndividualTaxAssessmentResult,
} from "@/modules/individual-tax/service";
import { demoIndividualTaxAssessments } from "@/server/demo-data";

describe("interactive individual tax assessment", () => {
  it("creates and calculates a saved assessment linked to a client", async () => {
    const created = await createIndividualTaxAssessmentForClient({
      clientId: "client_001",
      referenceNumber: "1234567890",
      taxpayerName: "Interactive Taxpayer",
      assessmentDate: "2026-03-09",
      input: {
        assessmentYear: 2026,
        salaryIncome: 500000,
        localInterest: 1000,
        travelAllowance: 50000,
        retirementContributions: 10000,
        travelDeduction: 5000,
        rebates: 17235,
        medicalTaxCredit: 10000,
        paye: 80000,
        priorAssessmentDebitOrCredit: 0,
        effectiveTaxRate: 0.25,
      },
    });

    const loaded = await getIndividualTaxAssessmentResult(created.id);
    expect(loaded).not.toBeNull();
    expect(loaded?.assessment.taxpayerName).toBe("Interactive Taxpayer");
    expect(loaded?.calc.summary.netAmountPayable).toBeGreaterThanOrEqual(0);

    const index = demoIndividualTaxAssessments.findIndex((entry) => entry.id === created.id);
    if (index >= 0) {
      demoIndividualTaxAssessments.splice(index, 1);
    }
  });

  it("creates and calculates a saved near-eFiling estimate linked to a client", async () => {
    const created = await createNearEfilingEstimateForClient({
      clientId: "client_001",
      referenceNumber: "9988776655",
      taxpayerName: "Near Efiling Taxpayer",
      assessmentDate: "2026-03-10",
      input: {
        profile: {
          assessmentYear: 2026,
          dateOfBirth: "1988-06-14",
          maritalStatus: "SINGLE",
          medicalAidMembers: 2,
          medicalAidMonths: 12,
        },
        employment: {
          salaryIncome: 780000,
          bonusIncome: 25000,
          commissionIncome: 0,
          fringeBenefits: 12000,
          otherTaxableEmploymentIncome: 0,
          payeWithheld: 165000,
        },
        travel: {
          hasTravelAllowance: true,
          travelAllowance: 85000,
          businessKilometres: 18500,
          totalKilometres: 30200,
          vehicleCost: 465000,
          vehiclePurchaseDate: "2023-03-01",
        },
        medical: {
          medicalSchemeContributions: 54000,
          qualifyingOutOfPocketExpenses: 12000,
          disabilityFlag: false,
        },
        interest: {
          localInterest: 8200,
        },
        rental: {
          grossRentalIncome: 96000,
          deductibleRentalExpenses: 27000,
        },
        soleProprietor: {
          grossBusinessIncome: 125000,
          deductibleBusinessExpenses: 49000,
        },
        deductions: {
          retirementContributions: 36000,
          donationsUnderSection18A: 1500,
          priorAssessmentDebitOrCredit: 0,
        },
      },
    });

    const loaded = await getIndividualTaxAssessmentResult(created.id);
    expect(loaded).not.toBeNull();
    expect(loaded?.assessment.assessmentMode).toBe("NEAR_EFILING_ESTIMATE");
    expect(loaded?.assessment.nearEfilingInput?.profile.assessmentYear).toBe(2026);
    expect(loaded?.calc.summary.taxableIncome).toBeGreaterThan(800000);

    const index = demoIndividualTaxAssessments.findIndex((entry) => entry.id === created.id);
    if (index >= 0) {
      demoIndividualTaxAssessments.splice(index, 1);
    }
  });
});
