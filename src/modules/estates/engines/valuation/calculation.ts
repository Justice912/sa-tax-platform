import type {
  EstateValuationCalculationInput,
  EstateValuationCalculationResult,
  EstateValuationComparableTransactionsResult,
  EstateValuationDcfResult,
  EstateValuationMaintainableEarningsResult,
  EstateValuationNetAssetValueResult,
  EstateValuationReconciliationMethodResult,
} from "@/modules/estates/engines/valuation/types";
import { estateValuationInputSchema } from "@/modules/estates/engines/valuation/validation";
import type { EstateBusinessValuationMethod } from "@/modules/estates/year-packs/types";

function roundCurrency(amount: number) {
  return Math.round(amount * 100) / 100;
}

function roundFactor(amount: number) {
  return Math.round(amount * 1_000_000) / 1_000_000;
}

function roundToNearest(amount: number, increment: number) {
  if (increment <= 0) {
    return roundCurrency(amount);
  }

  return roundCurrency(Math.round(amount / increment) * increment);
}

function determineEnabledMethods(input: EstateValuationCalculationInput) {
  if (input.enabledMethods && input.enabledMethods.length > 0) {
    return input.enabledMethods;
  }

  return input.method ? [input.method] : [];
}

function determinePrimaryMethod(
  methods: EstateBusinessValuationMethod[],
  reconciliation: EstateValuationCalculationInput["reconciliation"],
) {
  if (reconciliation?.methodWeights) {
    return [...methods].sort(
      (left, right) =>
        (reconciliation.methodWeights[right] ?? 0) - (reconciliation.methodWeights[left] ?? 0),
    )[0];
  }

  return methods[0];
}

function applyOwnership(value: number, shareholdingPercentage?: number) {
  if (shareholdingPercentage === undefined) {
    return value;
  }

  return value * (shareholdingPercentage / 100);
}

function applySequentialDiscounts(
  baseValue: number,
  marketabilityDiscountRate = 0,
  minorityDiscountRate = 0,
) {
  const minorityDiscountAmount = baseValue * minorityDiscountRate;
  const afterMinority = baseValue - minorityDiscountAmount;
  const marketabilityDiscountAmount = afterMinority * marketabilityDiscountRate;
  const finalValue = afterMinority - marketabilityDiscountAmount;

  return {
    marketabilityDiscountRate,
    marketabilityDiscountAmount: roundCurrency(marketabilityDiscountAmount),
    minorityDiscountRate,
    minorityDiscountAmount: roundCurrency(minorityDiscountAmount),
    finalValue: roundCurrency(finalValue),
  };
}

function calculateLegacyValuation(
  input: EstateValuationCalculationInput,
): EstateValuationCalculationResult {
  const nonOperatingAssets = input.nonOperatingAssets ?? 0;
  const liabilities = input.liabilities ?? 0;
  const netAdjustments = nonOperatingAssets - liabilities;

  const enterpriseValue =
    input.method === "NET_ASSET_VALUE"
      ? (input.assetValue ?? 0) + netAdjustments
      : (input.maintainableEarnings ?? 0) * (input.earningsMultiple ?? 0) + netAdjustments;

  const concludedValue =
    input.subjectType === "COMPANY_SHAREHOLDING"
      ? enterpriseValue * ((input.shareholdingPercentage ?? 0) / 100)
      : enterpriseValue;

  const roundedEnterpriseValue = roundCurrency(enterpriseValue);
  const roundedConcludedValue = roundCurrency(concludedValue);

  return {
    valuationDate: input.valuationDate,
    subjectType: input.subjectType,
    subjectDescription: input.subjectDescription,
    method: input.method ?? "NET_ASSET_VALUE",
    enabledMethods: [input.method ?? "NET_ASSET_VALUE"],
    assumptions: input.assumptions,
    concludedValue: roundedConcludedValue,
    warnings: [],
    summary: {
      enterpriseValue: roundedEnterpriseValue,
      netAdjustments: roundCurrency(netAdjustments),
      shareholdingPercentage: input.shareholdingPercentage ?? null,
    },
    downstreamCgtInput: {
      assetDescription: input.subjectDescription,
      marketValueAtDeath: roundedConcludedValue,
      valuationDate: input.valuationDate,
      valuationMethod: input.method ?? "NET_ASSET_VALUE",
    },
  };
}

function calculateDiscountedCashFlow(
  input: EstateValuationCalculationInput,
): EstateValuationDcfResult | undefined {
  if (!input.discountedCashFlow) {
    return undefined;
  }

  const debtWeight = input.discountedCashFlow.debtWeight ?? 0;
  const equityWeight = input.discountedCashFlow.equityWeight ?? 1;
  const costOfDebt = input.discountedCashFlow.costOfDebt ?? 0;
  const taxRate = input.discountedCashFlow.taxRate;
  const costOfEquity =
    input.discountedCashFlow.riskFreeRate +
    input.discountedCashFlow.beta * input.discountedCashFlow.equityRiskPremium +
    (input.discountedCashFlow.smallCompanyPremium ?? 0) +
    (input.discountedCashFlow.keyPersonPremium ?? 0);
  const afterTaxCostOfDebt = costOfDebt * (1 - taxRate);
  const wacc = equityWeight * costOfEquity + debtWeight * afterTaxCostOfDebt;

  const fcffSchedule = input.discountedCashFlow.forecastYears.map((year, index) => {
    const taxOnEbit = year.ebit * taxRate;
    const nopat = year.ebit - taxOnEbit;
    const fcff =
      nopat + year.depreciation - year.capitalExpenditure - year.workingCapitalChange;
    const discountFactor = 1 / Math.pow(1 + wacc, index + 1);
    const presentValue = fcff * discountFactor;

    return {
      label: year.label,
      revenue: year.revenue,
      ebit: roundCurrency(year.ebit),
      taxOnEbit: roundCurrency(taxOnEbit),
      nopat: roundCurrency(nopat),
      depreciation: roundCurrency(year.depreciation),
      capitalExpenditure: roundCurrency(year.capitalExpenditure),
      workingCapitalChange: roundCurrency(year.workingCapitalChange),
      fcff: roundCurrency(fcff),
      discountFactor: roundFactor(discountFactor),
      presentValue: roundCurrency(presentValue),
    };
  });

  const lastYear = input.discountedCashFlow.forecastYears[input.discountedCashFlow.forecastYears.length - 1];
  const lastFcff = fcffSchedule[fcffSchedule.length - 1]?.fcff ?? 0;
  const perpetualGrowthRate = input.discountedCashFlow.perpetualGrowthRate;
  const denominator = Math.max(wacc - perpetualGrowthRate, 0.01);
  const gordonGrowthTerminalValue = (lastFcff * (1 + perpetualGrowthRate)) / denominator;
  const lastYearEbitda = lastYear.ebit + lastYear.depreciation;
  const exitMultipleTerminalValue =
    input.discountedCashFlow.terminalExitMultiple !== undefined
      ? lastYearEbitda * input.discountedCashFlow.terminalExitMultiple
      : undefined;
  const adoptedTerminalValue =
    exitMultipleTerminalValue !== undefined
      ? (gordonGrowthTerminalValue + exitMultipleTerminalValue) / 2
      : gordonGrowthTerminalValue;
  const terminalDiscountFactor = fcffSchedule[fcffSchedule.length - 1]?.discountFactor ?? 1;
  const presentValueOfTerminal = adoptedTerminalValue * terminalDiscountFactor;
  const enterpriseValue =
    fcffSchedule.reduce((sum, year) => sum + year.presentValue, 0) + presentValueOfTerminal;
  const preDiscountEquityValue =
    enterpriseValue +
    (input.discountedCashFlow.cashAndEquivalents ?? 0) -
    (input.discountedCashFlow.interestBearingDebt ?? 0) -
    (input.discountedCashFlow.directorLoan ?? 0);
  const discounted = applySequentialDiscounts(
    preDiscountEquityValue,
    input.discountedCashFlow.marketabilityDiscountRate,
    input.discountedCashFlow.minorityDiscountRate,
  );

  return {
    fcffSchedule,
    costOfEquity: roundCurrency(costOfEquity),
    afterTaxCostOfDebt: roundCurrency(afterTaxCostOfDebt),
    wacc: roundCurrency(wacc),
    gordonGrowthTerminalValue: roundCurrency(gordonGrowthTerminalValue),
    exitMultipleTerminalValue:
      exitMultipleTerminalValue === undefined ? undefined : roundCurrency(exitMultipleTerminalValue),
    adoptedTerminalValue: roundCurrency(adoptedTerminalValue),
    enterpriseValue: roundCurrency(enterpriseValue),
    preDiscountEquityValue: roundCurrency(preDiscountEquityValue),
    marketabilityDiscountRate: discounted.marketabilityDiscountRate,
    marketabilityDiscountAmount: discounted.marketabilityDiscountAmount,
    minorityDiscountRate: discounted.minorityDiscountRate,
    minorityDiscountAmount: discounted.minorityDiscountAmount,
    indicatedValue: roundCurrency(
      applyOwnership(discounted.finalValue, input.shareholdingPercentage),
    ),
  };
}

function calculateMaintainableEarnings(
  input: EstateValuationCalculationInput,
): EstateValuationMaintainableEarningsResult | undefined {
  const legacyMaintainable =
    input.maintainableEarnings !== undefined && input.earningsMultiple !== undefined
      ? {
          historicalYears: [
            {
              label: "Maintainable earnings",
              reportedNpat: input.maintainableEarnings,
              nonRecurringAdjustments: 0,
              ownerRemunerationAdjustment: 0,
              weighting: 1,
            },
          ],
          selectedMultiple: input.earningsMultiple,
          marketabilityDiscountRate: 0,
          minorityDiscountRate: 0,
        }
      : undefined;

  const source = input.maintainableEarningsMethod ?? legacyMaintainable;
  if (!source) {
    return undefined;
  }

  const years = source.historicalYears;
  const normalizedYears = years.map((year) => {
    const nonRecurringAdjustments =
      "nonRecurringAdjustments" in year ? year.nonRecurringAdjustments ?? 0 : 0;
    const ownerRemunerationAdjustment =
      "ownerRemunerationAdjustment" in year ? year.ownerRemunerationAdjustment ?? 0 : 0;
    const normalisedNpat =
      year.reportedNpat + nonRecurringAdjustments + ownerRemunerationAdjustment;
    return {
      label: year.label,
      reportedNpat: roundCurrency(year.reportedNpat),
      nonRecurringAdjustments: roundCurrency(nonRecurringAdjustments),
      ownerRemunerationAdjustment: roundCurrency(ownerRemunerationAdjustment),
      normalisedNpat: roundCurrency(normalisedNpat),
      weighting: year.weighting ?? 1,
    };
  });

  const weightedTotal = normalizedYears.reduce(
    (sum, year) => sum + year.normalisedNpat * year.weighting,
    0,
  );
  const weightingTotal = normalizedYears.reduce((sum, year) => sum + year.weighting, 0);
  const maintainableEarnings =
    weightingTotal === 0 ? 0 : roundCurrency(weightedTotal / weightingTotal);
  const selectedMultiple = source.selectedMultiple;
  const preDiscountValue = maintainableEarnings * selectedMultiple;
  const discounted = applySequentialDiscounts(
    preDiscountValue,
    source.marketabilityDiscountRate,
    source.minorityDiscountRate,
  );

  return {
    years: normalizedYears,
    maintainableEarnings,
    selectedMultiple: roundCurrency(selectedMultiple),
    preDiscountValue: roundCurrency(preDiscountValue),
    marketabilityDiscountRate: discounted.marketabilityDiscountRate,
    marketabilityDiscountAmount: discounted.marketabilityDiscountAmount,
    minorityDiscountRate: discounted.minorityDiscountRate,
    minorityDiscountAmount: discounted.minorityDiscountAmount,
    indicatedValue: roundCurrency(
      applyOwnership(discounted.finalValue, input.shareholdingPercentage),
    ),
  };
}

function calculateNetAssetValue(
  input: EstateValuationCalculationInput,
): EstateValuationNetAssetValueResult | undefined {
  if (input.netAssetValueMethod) {
    const assets = input.netAssetValueMethod.assets.map((line) => ({
      category: line.category,
      bookValue: roundCurrency(line.bookValue),
      adjustment: roundCurrency(line.adjustment),
      fairMarketValue: roundCurrency(line.bookValue + line.adjustment),
    }));
    const liabilities = input.netAssetValueMethod.liabilities.map((line) => ({
      category: line.category,
      bookValue: roundCurrency(line.bookValue),
      adjustment: roundCurrency(line.adjustment),
      fairMarketValue: roundCurrency(line.bookValue + line.adjustment),
    }));
    const adjustedAssets = assets.reduce((sum, line) => sum + line.fairMarketValue, 0);
    const adjustedLiabilities = liabilities.reduce((sum, line) => sum + line.fairMarketValue, 0);

    return {
      assets,
      liabilities,
      adjustedAssets: roundCurrency(adjustedAssets),
      adjustedLiabilities: roundCurrency(adjustedLiabilities),
      indicatedValue: roundCurrency(
        applyOwnership(adjustedAssets - adjustedLiabilities, input.shareholdingPercentage),
      ),
    };
  }

  if (input.assetValue !== undefined || input.nonOperatingAssets !== undefined || input.liabilities !== undefined) {
    const adjustedAssets = (input.assetValue ?? 0) + (input.nonOperatingAssets ?? 0);
    const adjustedLiabilities = input.liabilities ?? 0;
    return {
      assets: [
        {
          category: "Asset value input",
          bookValue: roundCurrency(input.assetValue ?? 0),
          adjustment: roundCurrency(input.nonOperatingAssets ?? 0),
          fairMarketValue: roundCurrency(adjustedAssets),
        },
      ],
      liabilities: [
        {
          category: "Liabilities",
          bookValue: roundCurrency(input.liabilities ?? 0),
          adjustment: 0,
          fairMarketValue: roundCurrency(adjustedLiabilities),
        },
      ],
      adjustedAssets: roundCurrency(adjustedAssets),
      adjustedLiabilities: roundCurrency(adjustedLiabilities),
      indicatedValue: roundCurrency(
        applyOwnership(adjustedAssets - adjustedLiabilities, input.shareholdingPercentage),
      ),
    };
  }

  return undefined;
}

function calculateComparableTransactions(
  input: EstateValuationCalculationInput,
): EstateValuationComparableTransactionsResult | undefined {
  if (!input.comparableTransactionsMethod) {
    return undefined;
  }

  const { transactions, selectedMultipleType, subjectMetric } =
    input.comparableTransactionsMethod;

  if (transactions.length === 0) {
    return undefined;
  }

  const mappedTransactions = transactions.map((tx) => {
    const selectedMultiple =
      selectedMultipleType === "REVENUE"
        ? tx.revenueMultiple ?? 0
        : selectedMultipleType === "EBITDA"
          ? tx.ebitdaMultiple ?? 0
          : tx.peMultiple ?? 0;

    return {
      description: tx.description,
      transactionDate: tx.transactionDate,
      enterpriseValue: roundCurrency(tx.enterpriseValue),
      selectedMultiple: roundCurrency(selectedMultiple),
    };
  });

  const validMultiples = mappedTransactions.filter((tx) => tx.selectedMultiple > 0);
  const averageMultiple =
    validMultiples.length > 0
      ? roundCurrency(
          validMultiples.reduce((sum, tx) => sum + tx.selectedMultiple, 0) /
            validMultiples.length,
        )
      : 0;

  const preDiscountValue = roundCurrency(subjectMetric * averageMultiple);
  const discounted = applySequentialDiscounts(
    preDiscountValue,
    input.comparableTransactionsMethod.marketabilityDiscountRate,
    input.comparableTransactionsMethod.minorityDiscountRate,
  );

  return {
    transactions: mappedTransactions,
    selectedMultipleType,
    averageMultiple,
    subjectMetric: roundCurrency(subjectMetric),
    preDiscountValue,
    marketabilityDiscountRate: discounted.marketabilityDiscountRate,
    marketabilityDiscountAmount: discounted.marketabilityDiscountAmount,
    minorityDiscountRate: discounted.minorityDiscountRate,
    minorityDiscountAmount: discounted.minorityDiscountAmount,
    indicatedValue: roundCurrency(
      applyOwnership(discounted.finalValue, input.shareholdingPercentage),
    ),
  };
}

function buildReconciliation(
  enabledMethods: EstateBusinessValuationMethod[],
  indicatedValues: Partial<Record<EstateBusinessValuationMethod, number>>,
  reconciliation: EstateValuationCalculationInput["reconciliation"],
) {
  const providedWeights = reconciliation?.methodWeights ?? {};
  const fallbackWeight = enabledMethods.length > 0 ? 1 / enabledMethods.length : 0;
  const methods: EstateValuationReconciliationMethodResult[] = enabledMethods.map((method) => {
    const indicatedValue = indicatedValues[method] ?? 0;
    const weight = providedWeights[method] ?? fallbackWeight;
    return {
      method,
      indicatedValue: roundCurrency(indicatedValue),
      weight: roundCurrency(weight),
      weightedValue: roundCurrency(indicatedValue * weight),
    };
  });
  const weightedAverageValue = roundCurrency(
    methods.reduce((sum, method) => sum + method.weightedValue, 0),
  );
  const conclusionRounding = reconciliation?.conclusionRounding ?? 50000;
  const concludedValue = roundToNearest(weightedAverageValue, conclusionRounding);
  return {
    methods,
    weightedAverageValue,
    concludedValue,
    rationale:
      reconciliation?.rationale ??
      "The concluded value is determined by weighting the selected valuation methods according to their reliability and relevance to the subject business.",
    conclusionRounding,
  };
}

function buildSensitivityScenarios(
  input: EstateValuationCalculationInput,
  reconciliation: ReturnType<typeof buildReconciliation>,
) {
  const base = reconciliation.concludedValue;
  const dcf = input.discountedCashFlow;
  const earnings = input.maintainableEarningsMethod;

  return {
    scenarios: [
      {
        scenario: "Bear case",
        wacc: dcf ? roundCurrency((dcf.equityWeight ?? 1) * 0 + (dcf.debtWeight ?? 0) * 0 + ((dcf.riskFreeRate + dcf.beta * dcf.equityRiskPremium + (dcf.smallCompanyPremium ?? 0) + (dcf.keyPersonPremium ?? 0)) * (dcf.equityWeight ?? 1) + ((dcf.costOfDebt ?? 0) * (1 - dcf.taxRate)) * (dcf.debtWeight ?? 0) + 0.018)) : undefined,
        growthRate: dcf ? Math.max((dcf.perpetualGrowthRate ?? 0) - 0.02, 0) : undefined,
        earningsMultiple: earnings ? roundCurrency(Math.max(earnings.selectedMultiple - 0.5, 0.5)) : undefined,
        indicatedValue: roundCurrency(base * 0.85),
      },
      {
        scenario: "Base case",
        wacc: dcf ? roundCurrency((dcf.equityWeight ?? 1) * 0 + (dcf.debtWeight ?? 0) * 0 + ((dcf.riskFreeRate + dcf.beta * dcf.equityRiskPremium + (dcf.smallCompanyPremium ?? 0) + (dcf.keyPersonPremium ?? 0)) * (dcf.equityWeight ?? 1) + ((dcf.costOfDebt ?? 0) * (1 - dcf.taxRate)) * (dcf.debtWeight ?? 0))) : undefined,
        growthRate: dcf?.perpetualGrowthRate,
        earningsMultiple: earnings?.selectedMultiple,
        indicatedValue: base,
      },
      {
        scenario: "Bull case",
        wacc: dcf ? roundCurrency(Math.max((((dcf.riskFreeRate + dcf.beta * dcf.equityRiskPremium + (dcf.smallCompanyPremium ?? 0) + (dcf.keyPersonPremium ?? 0)) * (dcf.equityWeight ?? 1) + ((dcf.costOfDebt ?? 0) * (1 - dcf.taxRate)) * (dcf.debtWeight ?? 0)) - 0.015), 0)) : undefined,
        growthRate: dcf ? roundCurrency((dcf.perpetualGrowthRate ?? 0) + 0.01) : undefined,
        earningsMultiple: earnings ? roundCurrency(earnings.selectedMultiple + 0.5) : undefined,
        indicatedValue: roundCurrency(base * 1.15),
      },
    ],
  };
}

function buildTaxImplicationsPreview(
  concludedValue: number,
  subjectType: EstateValuationCalculationInput["subjectType"],
) {
  const deemedProceeds = concludedValue;
  const deathExclusion = 300000;
  const inclusionRate = 0.4;
  const capitalGain = Math.max(deemedProceeds - deathExclusion, 0);
  const taxableCapitalGain = roundCurrency(capitalGain * inclusionRate);
  const grossEstate = roundCurrency(concludedValue);
  const dutiableEstate = roundCurrency(Math.max(grossEstate - 3500000, 0));
  const estateDutyPayable = roundCurrency(
    dutiableEstate <= 30000000 ? dutiableEstate * 0.2 : 30000000 * 0.2 + (dutiableEstate - 30000000) * 0.25,
  );

  const subjectTypeLabel =
    subjectType === "SOLE_PROPRIETORSHIP"
      ? "sole proprietorship"
      : subjectType === "PARTNERSHIP"
        ? "partnership interest"
        : subjectType === "CLOSE_CORPORATION"
          ? "close corporation member's interest"
          : subjectType === "PRIVATE_COMPANY" || subjectType === "PUBLIC_COMPANY"
            ? "company shareholding"
            : "company shareholding";

  return {
    cgtSummary: {
      deemedProceeds,
      deathExclusion,
      capitalGain,
      inclusionRate,
      taxableCapitalGain,
    },
    estateDutySummary: {
      grossEstate,
      dutiableEstate,
      estateDutyPayable,
    },
    section9haNotes: [
      "Section 9HA rollover may defer the immediate CGT charge where the asset accrues to a surviving spouse.",
      `For a ${subjectTypeLabel}, the valuation supports the deceased's final ITR12, CGT disclosure, estate duty, and L&D account evidence.`,
    ],
  };
}

export function calculateEstateValuation(
  input: EstateValuationCalculationInput,
): EstateValuationCalculationResult {
  const parsed = estateValuationInputSchema.parse(input);
  const enabledMethods = determineEnabledMethods(parsed);

  if (!parsed.enabledMethods && parsed.method && enabledMethods.length === 1) {
    return calculateLegacyValuation({
      ...parsed,
      enabledMethods,
      method: parsed.method,
    });
  }

  const dcfResult = enabledMethods.includes("DISCOUNTED_CASH_FLOW")
    ? calculateDiscountedCashFlow(parsed)
    : undefined;
  const maintainableEarningsResult = enabledMethods.includes("MAINTAINABLE_EARNINGS")
    ? calculateMaintainableEarnings(parsed)
    : undefined;
  const netAssetValueResult = enabledMethods.includes("NET_ASSET_VALUE")
    ? calculateNetAssetValue(parsed)
    : undefined;
  const comparableResult = enabledMethods.includes("COMPARABLE_TRANSACTIONS")
    ? calculateComparableTransactions(parsed)
    : undefined;

  const indicatedValues: Partial<Record<EstateBusinessValuationMethod, number>> = {
    DISCOUNTED_CASH_FLOW: dcfResult?.indicatedValue,
    MAINTAINABLE_EARNINGS: maintainableEarningsResult?.indicatedValue,
    NET_ASSET_VALUE: netAssetValueResult?.indicatedValue,
    COMPARABLE_TRANSACTIONS: comparableResult?.indicatedValue,
  };

  const reconciliation = buildReconciliation(
    enabledMethods,
    indicatedValues,
    parsed.reconciliation,
  );
  const primaryMethod = determinePrimaryMethod(enabledMethods, parsed.reconciliation);
  const enterpriseValue =
    primaryMethod === "DISCOUNTED_CASH_FLOW"
      ? dcfResult?.enterpriseValue ?? reconciliation.weightedAverageValue
      : primaryMethod === "MAINTAINABLE_EARNINGS"
        ? maintainableEarningsResult?.preDiscountValue ?? reconciliation.weightedAverageValue
        : primaryMethod === "COMPARABLE_TRANSACTIONS"
          ? comparableResult?.preDiscountValue ?? reconciliation.weightedAverageValue
          : netAssetValueResult?.indicatedValue ?? reconciliation.weightedAverageValue;
  const netAdjustments = parsed.netAssetValueMethod
    ? netAssetValueResult
      ? netAssetValueResult.adjustedAssets - netAssetValueResult.adjustedLiabilities
      : 0
    : (parsed.nonOperatingAssets ?? 0) - (parsed.liabilities ?? 0);

  const warnings: string[] = [];

  if (reconciliation.concludedValue <= 0) {
    warnings.push("Concluded value is zero or negative — review inputs for errors.");
  }

  if (dcfResult) {
    const dcf = parsed.discountedCashFlow;
    if (dcf && dcf.perpetualGrowthRate >= (dcfResult.wacc - 0.005)) {
      warnings.push("Perpetual growth rate is at or above WACC — terminal value may be unreliable.");
    }
  }

  if (enabledMethods.length > 1) {
    const values = Object.values(indicatedValues).filter((v): v is number => v !== undefined && v > 0);
    if (values.length >= 2) {
      const maxVal = Math.max(...values);
      const minVal = Math.min(...values);
      if (maxVal > 0 && (maxVal - minVal) / maxVal > 0.5) {
        warnings.push("Method indicated values differ by more than 50% — review methodology assumptions.");
      }
    }
  }

  if (parsed.shareholdingPercentage !== undefined && parsed.shareholdingPercentage < 50) {
    warnings.push("Minority shareholding — consider whether minority and marketability discounts are appropriate.");
  }

  return {
    valuationDate: parsed.valuationDate,
    subjectType: parsed.subjectType,
    subjectDescription: parsed.subjectDescription,
    method: primaryMethod,
    enabledMethods,
    assumptions: parsed.assumptions,
    concludedValue: reconciliation.concludedValue,
    warnings,
    summary: {
      enterpriseValue: roundCurrency(enterpriseValue),
      netAdjustments: roundCurrency(netAdjustments),
      shareholdingPercentage: parsed.shareholdingPercentage ?? null,
      weightedAverageValue: reconciliation.weightedAverageValue,
    },
    historicalFinancialAnalysis: parsed.historicalFinancialAnalysis,
    methodResults: {
      discountedCashFlow: dcfResult,
      maintainableEarnings: maintainableEarningsResult,
      netAssetValue: netAssetValueResult,
      comparableTransactions: comparableResult,
    },
    reconciliation: {
      methods: reconciliation.methods,
      weightedAverageValue: reconciliation.weightedAverageValue,
      concludedValue: reconciliation.concludedValue,
      rationale: reconciliation.rationale,
      conclusionRounding: reconciliation.conclusionRounding,
    },
    sensitivityAnalysis: buildSensitivityScenarios(parsed, reconciliation),
    taxImplicationsPreview: buildTaxImplicationsPreview(
      reconciliation.concludedValue,
      parsed.subjectType,
    ),
    downstreamCgtInput: {
      assetDescription: parsed.subjectDescription,
      marketValueAtDeath: reconciliation.concludedValue,
      valuationDate: parsed.valuationDate,
      valuationMethod: primaryMethod,
    },
  };
}
