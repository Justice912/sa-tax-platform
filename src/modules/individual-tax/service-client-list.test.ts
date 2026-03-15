import {
  createIndividualTaxAssessmentForClient,
  createNearEfilingEstimateForClient,
  getIndividualTaxReportData,
  listIndividualTaxAssessmentsByClient,
} from "@/modules/individual-tax/service";
import { demoClients, demoIndividualTaxAssessments } from "@/server/demo-data";

describe("individual tax assessments by client", () => {
  it("returns only assessments linked to the requested client", async () => {
    const createdForClient001 = await createIndividualTaxAssessmentForClient({
      clientId: "client_001",
      referenceNumber: "001-CLIENT-TEST",
      taxpayerName: "Client One Taxpayer",
      assessmentDate: "2026-03-09",
      input: {
        assessmentYear: 2026,
        salaryIncome: 450000,
        localInterest: 1000,
        travelAllowance: 35000,
        retirementContributions: 10000,
        travelDeduction: 4000,
        rebates: 17235,
        medicalTaxCredit: 5000,
        paye: 85000,
        priorAssessmentDebitOrCredit: 0,
        effectiveTaxRate: 0.25,
      },
    });

    const createdForClient002 = await createIndividualTaxAssessmentForClient({
      clientId: "client_002",
      referenceNumber: "002-CLIENT-TEST",
      taxpayerName: "Client Two Taxpayer",
      assessmentDate: "2026-03-09",
      input: {
        assessmentYear: 2026,
        salaryIncome: 550000,
        localInterest: 1500,
        travelAllowance: 45000,
        retirementContributions: 11000,
        travelDeduction: 5000,
        rebates: 17235,
        medicalTaxCredit: 6000,
        paye: 105000,
        priorAssessmentDebitOrCredit: 0,
        effectiveTaxRate: 0.26,
      },
    });

    const client001Assessments = await listIndividualTaxAssessmentsByClient("client_001");
    const found001 = client001Assessments.find((entry) => entry.id === createdForClient001.id);
    const found002 = client001Assessments.find((entry) => entry.id === createdForClient002.id);

    expect(found001).toBeDefined();
    expect(found002).toBeUndefined();

    [createdForClient001.id, createdForClient002.id].forEach((id) => {
      const index = demoIndividualTaxAssessments.findIndex((entry) => entry.id === id);
      if (index >= 0) {
        demoIndividualTaxAssessments.splice(index, 1);
      }
    });
  });

  it("includes linked client address data in the print report payload", async () => {
    const targetClient = demoClients.find((client) => client.id === "client_001");
    const originalAddress = (targetClient as { address?: string } | undefined)?.address;

    if (targetClient) {
      (targetClient as { address?: string }).address =
        "51 Empire Road\nParktown\nJohannesburg\n2193";
    }

    try {
      const reportData = await getIndividualTaxReportData("itax_001");

      expect(reportData).not.toBeNull();
      expect(reportData?.report.header.taxpayer.addressLines).toEqual([
        "51 Empire Road",
        "Parktown",
        "Johannesburg",
        "2193",
      ]);
    } finally {
      if (targetClient) {
        (targetClient as { address?: string }).address = originalAddress;
      }
    }
  });

  it("lists near-eFiling estimates for the requested client", async () => {
    const created = await createNearEfilingEstimateForClient({
      clientId: "client_001",
      referenceNumber: "5544332211",
      taxpayerName: "Client Estimate Taxpayer",
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
          hasTravelAllowance: false,
          travelAllowance: 0,
          businessKilometres: 0,
          totalKilometres: 0,
          vehicleCost: 0,
          vehiclePurchaseDate: "2024-03-01",
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

    const clientAssessments = await listIndividualTaxAssessmentsByClient("client_001");
    const found = clientAssessments.find((entry) => entry.id === created.id);

    expect(found?.assessmentMode).toBe("NEAR_EFILING_ESTIMATE");
    expect(found?.nearEfilingInput?.rental.grossRentalIncome).toBe(96000);

    const index = demoIndividualTaxAssessments.findIndex((entry) => entry.id === created.id);
    if (index >= 0) {
      demoIndividualTaxAssessments.splice(index, 1);
    }
  });
});
