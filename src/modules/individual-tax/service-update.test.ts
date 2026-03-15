import {
  createIndividualTaxAssessmentForClient,
  createNearEfilingEstimateForClient,
  getIndividualTaxAssessmentResult,
  updateNearEfilingEstimateInput,
  updateIndividualTaxAssessmentInput,
} from "@/modules/individual-tax/service";
import { demoIndividualTaxAssessments } from "@/server/demo-data";

describe("individual tax assessment update flow", () => {
  it("updates saved assessment input and recalculates output", async () => {
    const created = await createIndividualTaxAssessmentForClient({
      clientId: "client_001",
      referenceNumber: "1234500000",
      taxpayerName: "Assessment Update Tester",
      assessmentDate: "2026-03-09",
      input: {
        assessmentYear: 2026,
        salaryIncome: 400000,
        localInterest: 500,
        travelAllowance: 40000,
        retirementContributions: 8000,
        travelDeduction: 3000,
        rebates: 17235,
        medicalTaxCredit: 5000,
        paye: 60000,
        priorAssessmentDebitOrCredit: 0,
        effectiveTaxRate: 0.25,
      },
    });

    await updateIndividualTaxAssessmentInput(created.id, {
      assessmentYear: 2026,
      salaryIncome: 650000,
      localInterest: 2000,
      travelAllowance: 70000,
      retirementContributions: 12000,
      travelDeduction: 10000,
      rebates: 17235,
      medicalTaxCredit: 7000,
      paye: 140000,
      priorAssessmentDebitOrCredit: 0,
      effectiveTaxRate: 0.27,
    });

    const loaded = await getIndividualTaxAssessmentResult(created.id);
    expect(loaded).not.toBeNull();
    expect(loaded?.assessment.input.salaryIncome).toBe(650000);
    expect(loaded?.calc.summary.taxableIncome).toBeGreaterThan(0);

    const index = demoIndividualTaxAssessments.findIndex((entry) => entry.id === created.id);
    if (index >= 0) {
      demoIndividualTaxAssessments.splice(index, 1);
    }
  });

  it("updates a saved near-eFiling estimate and recalculates output", async () => {
    const created = await createNearEfilingEstimateForClient({
      clientId: "client_001",
      referenceNumber: "1122334455",
      taxpayerName: "Near Efiling Update Tester",
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
          salaryIncome: 500000,
          bonusIncome: 10000,
          commissionIncome: 0,
          fringeBenefits: 0,
          otherTaxableEmploymentIncome: 0,
          payeWithheld: 85000,
        },
        travel: {
          hasTravelAllowance: false,
          travelAllowance: 0,
          businessKilometres: 0,
          totalKilometres: 0,
          vehicleCost: 0,
          vehiclePurchaseDate: "2024-03-01",
        },
        medical: {
          medicalSchemeContributions: 36000,
          qualifyingOutOfPocketExpenses: 2000,
          disabilityFlag: false,
        },
        interest: {
          localInterest: 1000,
        },
        rental: {
          grossRentalIncome: 0,
          deductibleRentalExpenses: 0,
        },
        soleProprietor: {
          grossBusinessIncome: 0,
          deductibleBusinessExpenses: 0,
        },
        deductions: {
          retirementContributions: 12000,
          donationsUnderSection18A: 0,
          priorAssessmentDebitOrCredit: 0,
        },
      },
    });

    await updateNearEfilingEstimateInput(created.id, {
      profile: {
        assessmentYear: 2027,
        dateOfBirth: "1960-01-10",
        maritalStatus: "MARRIED_OUT_OF_COMMUNITY",
        medicalAidMembers: 3,
        medicalAidMonths: 10,
      },
      employment: {
        salaryIncome: 650000,
        bonusIncome: 15000,
        commissionIncome: 20000,
        fringeBenefits: 0,
        otherTaxableEmploymentIncome: 0,
        payeWithheld: 120000,
      },
      travel: {
        hasTravelAllowance: true,
        travelAllowance: 90000,
        businessKilometres: 15000,
        totalKilometres: 30000,
        vehicleCost: 480000,
        vehiclePurchaseDate: "2025-04-01",
      },
      medical: {
        medicalSchemeContributions: 60000,
        qualifyingOutOfPocketExpenses: 18000,
        disabilityFlag: false,
      },
      interest: {
        localInterest: 40000,
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
        retirementContributions: 42000,
        donationsUnderSection18A: 2500,
        priorAssessmentDebitOrCredit: -1000,
      },
    });

    const loaded = await getIndividualTaxAssessmentResult(created.id);
    expect(loaded).not.toBeNull();
    expect(loaded?.assessment.assessmentMode).toBe("NEAR_EFILING_ESTIMATE");
    expect(loaded?.assessment.nearEfilingInput?.profile.assessmentYear).toBe(2027);
    expect(loaded?.calc.summary.totalIncome).toBeGreaterThan(900000);

    const index = demoIndividualTaxAssessments.findIndex((entry) => entry.id === created.id);
    if (index >= 0) {
      demoIndividualTaxAssessments.splice(index, 1);
    }
  });
});
