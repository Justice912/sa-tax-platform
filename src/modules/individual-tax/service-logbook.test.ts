import {
  createNearEfilingEstimateForClient,
  getIndividualTaxAssessmentResult,
} from "@/modules/individual-tax/service";
import type { NearEfilingIndividualTaxInput } from "@/modules/individual-tax/types";
import { getLogbookForClientYear, getLogbookTravelResult } from "@/modules/logbook/service";
import { demoIndividualTaxAssessments } from "@/server/demo-data";

function r2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Base near-eFiling fixture modelled on service-interactive.test.ts's client_001 case —
    travelAllowance 85000, businessKilometres 18500, totalKilometres 30200 — parameterised
    only by the fields each test needs to vary (assessment year). */
function buildNearEfilingInput(assessmentYear: number): NearEfilingIndividualTaxInput {
  return {
    profile: {
      assessmentYear,
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
  };
}

async function createAndLoad(clientId: string, assessmentYear: number) {
  const created = await createNearEfilingEstimateForClient({
    clientId,
    referenceNumber: `LOGTEST-${clientId}-${assessmentYear}`,
    taxpayerName: "Logbook Integration Taxpayer",
    assessmentDate: "2026-03-10",
    input: buildNearEfilingInput(assessmentYear),
  });

  const loaded = await getIndividualTaxAssessmentResult(created.id);

  return { created, loaded };
}

function cleanup(assessmentId: string) {
  const index = demoIndividualTaxAssessments.findIndex((entry) => entry.id === assessmentId);
  if (index >= 0) {
    demoIndividualTaxAssessments.splice(index, 1);
  }
}

const RATIO_ESTIMATE = r2(85000 * (18500 / 30200));

describe("near-eFiling assessment logbook integration", () => {
  it("feeds a real assessment from the seeded demo logbook (client_001, 2026)", async () => {
    const logbook = await getLogbookForClientYear("client_001", 2026);
    expect(logbook).not.toBeNull();
    const travelResult = await getLogbookTravelResult(logbook!.id);
    const expected = r2(Math.min(travelResult.claimedDeduction, 85000));

    const { created, loaded } = await createAndLoad("client_001", 2026);
    try {
      expect(loaded).not.toBeNull();
      const travelClaimLine = loaded?.calc.deductionLines.find(
        (line) => line.code === "TRAVEL_CLAIM",
      );
      expect(travelClaimLine).toBeDefined();
      expect(travelClaimLine?.amountAssessed).toBe(-expected);
      expect(travelClaimLine?.computations).toContain("Logbook-based");
      expect(travelClaimLine?.computations).toContain("DEEMED");

      // Guard against silent fallback to the pre-phase ratio estimate.
      expect(travelClaimLine?.amountAssessed).not.toBe(-RATIO_ESTIMATE);
    } finally {
      cleanup(created.id);
    }
  });

  it("falls back to the ratio estimate when the client has no logbook (client_002)", async () => {
    const noLogbook = await getLogbookForClientYear("client_002", 2026);
    expect(noLogbook).toBeNull();

    const { created, loaded } = await createAndLoad("client_002", 2026);
    try {
      expect(loaded).not.toBeNull();
      const travelClaimLine = loaded?.calc.deductionLines.find(
        (line) => line.code === "TRAVEL_CLAIM",
      );
      expect(travelClaimLine).toBeDefined();
      expect(travelClaimLine?.amountAssessed).toBe(-RATIO_ESTIMATE);
      expect(travelClaimLine?.computations).toContain("no logbook");
    } finally {
      cleanup(created.id);
    }
  });

  it("falls back to the ratio estimate when the client's logbook doesn't cover this year (client_001, 2027)", async () => {
    const noLogbookForYear = await getLogbookForClientYear("client_001", 2027);
    expect(noLogbookForYear).toBeNull();

    const { created, loaded } = await createAndLoad("client_001", 2027);
    try {
      expect(loaded).not.toBeNull();
      const travelClaimLine = loaded?.calc.deductionLines.find(
        (line) => line.code === "TRAVEL_CLAIM",
      );
      expect(travelClaimLine).toBeDefined();
      expect(travelClaimLine?.amountAssessed).toBe(-RATIO_ESTIMATE);
      expect(travelClaimLine?.computations).toContain("no logbook");
    } finally {
      cleanup(created.id);
    }
  });
});
