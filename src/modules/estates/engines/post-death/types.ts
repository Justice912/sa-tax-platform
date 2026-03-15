import type { EstateEngineRunRecord } from "@/modules/estates/engines/types";
import type { EstatePostDeathRateMode } from "@/modules/estates/year-packs/types";

export interface EstatePostDeathIncomeSchedule {
  interestIncome: number;
  rentalIncome: number;
  businessIncome: number;
  otherIncome: number;
}

export interface EstatePostDeathCalculationInput {
  rateMode: EstatePostDeathRateMode;
  trustRate: number;
  estateRate: number;
  incomeSchedule: EstatePostDeathIncomeSchedule;
  deductions: number;
  distributedIncome?: number;
}

export interface EstatePostDeathCalculationResult {
  warnings: string[];
  summary: {
    totalIncome: number;
    distributedIncome: number;
    retainedIncome: number;
    deductions: number;
    taxableIncome: number;
    appliedRate: number;
    taxPayable: number;
  };
}

export interface EstatePostDeathRunInput {
  estateId: string;
  taxYear: number;
  incomeSchedule: EstatePostDeathIncomeSchedule;
  deductions: number;
  distributedIncome?: number;
}

export interface EstatePostDeathRunResult {
  run: EstateEngineRunRecord;
  calculation: EstatePostDeathCalculationResult;
}
