import {
  ESTATE_FILING_PACK_REQUIRED_ENGINE_VALUES,
  type EstateFilingPackRequiredEngine,
} from "@/modules/estates/forms/types";
import type {
  EstateEngineDependencyState,
  EstateEngineRunRecord,
  EstateEngineType,
} from "@/modules/estates/engines/types";
import type { EstateDetailRecord } from "@/modules/estates/types";

const currencyFormatter = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 2,
});

export function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

export function formatPercent(value: number) {
  return `${(value * 100).toLocaleString("en-ZA", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}%`;
}

function humanizeEnumLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatValuationMethodLabel(value: string) {
  switch (value) {
    case "NET_ASSET_VALUE":
      return "Net asset value (NAV)";
    case "MAINTAINABLE_EARNINGS":
      return "Maintainable earnings";
    case "DISCOUNTED_CASH_FLOW":
      return "Discounted cash flow (DCF)";
    default:
      return humanizeEnumLabel(value);
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function readNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "number" ? value : 0;
}

function readString(record: Record<string, unknown>, key: string, fallback = "") {
  const value = record[key];
  return typeof value === "string" ? value : fallback;
}

function sortRuns(left: EstateEngineRunRecord, right: EstateEngineRunRecord) {
  return (right.approvedAt ?? right.updatedAt).localeCompare(left.approvedAt ?? left.updatedAt);
}

export function selectLatestEngineRun(
  runs: EstateEngineRunRecord[],
  engineType: EstateEngineType,
) {
  return runs.filter((run) => run.engineType === engineType).sort(sortRuns)[0] ?? null;
}

function toDependencyStatus(run: EstateEngineRunRecord | null) {
  if (!run) {
    return "MISSING" as const;
  }

  return run.status === "APPROVED" && run.reviewRequired === false ? "APPROVED" : "DRAFT";
}

function toDependencyState(
  run: EstateEngineRunRecord | null,
  engineType: EstateEngineType,
): EstateEngineDependencyState {
  const status = toDependencyStatus(run);

  return {
    engineType,
    runId: run?.id,
    status,
    isStale: status === "DRAFT",
    reviewedAt: status === "APPROVED" ? run?.approvedAt : undefined,
  };
}

export function buildEstateDutyDependencyStates(
  estate: Pick<EstateDetailRecord, "assets">,
  runs: EstateEngineRunRecord[],
) {
  const dependencyStates: EstateEngineDependencyState[] = [];

  if (estate.assets.length > 0) {
    dependencyStates.push(toDependencyState(selectLatestEngineRun(runs, "CGT_ON_DEATH"), "CGT_ON_DEATH"));
  }

  if (estate.assets.some((asset) => asset.category === "BUSINESS_INTEREST")) {
    dependencyStates.push(
      toDependencyState(selectLatestEngineRun(runs, "BUSINESS_VALUATION"), "BUSINESS_VALUATION"),
    );
  }

  return dependencyStates;
}

export interface EstateFilingPackEngineReadiness {
  engineType: EstateFilingPackRequiredEngine;
  status: "MISSING" | "DRAFT" | "APPROVED";
  detail: string;
  runId?: string;
}

export function buildEstateFilingPackReadiness(runs: EstateEngineRunRecord[]) {
  return ESTATE_FILING_PACK_REQUIRED_ENGINE_VALUES.map((engineType) => {
    const run = selectLatestEngineRun(runs, engineType);
    const status = toDependencyStatus(run);

    if (!run) {
      return {
        engineType,
        status,
        detail: "No run has been created yet.",
      } satisfies EstateFilingPackEngineReadiness;
    }

    if (status === "APPROVED") {
      return {
        engineType,
        status,
        runId: run.id,
        detail: `Approved run ${run.id} is current.`,
      } satisfies EstateFilingPackEngineReadiness;
    }

    return {
      engineType,
      status,
      runId: run.id,
      detail: `Latest run ${run.id} still requires review before it can feed the filing pack.`,
    } satisfies EstateFilingPackEngineReadiness;
  });
}

export function buildEngineSummaryRows(run: EstateEngineRunRecord | null) {
  if (!run) {
    return [];
  }

  const output = asRecord(run.outputSnapshot);

  switch (run.engineType) {
    case "BUSINESS_VALUATION": {
      const report = asRecord(output.report);
      const summary = asRecord(report.summary);

      return [
        { label: "Subject", value: readString(summary, "subjectDescription", "-") },
        {
          label: "Concluded value",
          value: formatCurrency(readNumber(summary, "concludedValue")),
        },
        {
          label: "Method",
          value: formatValuationMethodLabel(readString(summary, "method", "-")),
        },
      ];
    }
    case "PRE_DEATH_ITR12": {
      const transformedInput = asRecord(output.transformedInput);
      const calculation = asRecord(output.calculation);
      const summary = asRecord(calculation.summary);

      return [
        { label: "Taxpayer", value: readString(transformedInput, "taxpayerName", "-") },
        {
          label: "Taxable income",
          value: formatCurrency(readNumber(summary, "taxableIncome")),
        },
        {
          label: "Net refundable",
          value: formatCurrency(readNumber(summary, "netAmountRefundable")),
        },
      ];
    }
    case "CGT_ON_DEATH": {
      const calculation = asRecord(output.calculation);
      const summary = asRecord(calculation.summary);

      return [
        {
          label: "Taxable capital gain",
          value: formatCurrency(readNumber(summary, "taxableCapitalGain")),
        },
        {
          label: "Aggregate net capital gain",
          value: formatCurrency(readNumber(summary, "aggregateNetCapitalGain")),
        },
        {
          label: "Inclusion rate",
          value: formatPercent(readNumber(summary, "inclusionRate")),
        },
      ];
    }
    case "ESTATE_DUTY": {
      const calculation = asRecord(output.calculation);
      const summary = asRecord(calculation.summary);

      return [
        {
          label: "Dutiable estate",
          value: formatCurrency(readNumber(summary, "dutiableEstate")),
        },
        {
          label: "Estate duty payable",
          value: formatCurrency(readNumber(summary, "estateDutyPayable")),
        },
        {
          label: "Net estate before abatement",
          value: formatCurrency(readNumber(summary, "netEstateBeforeAbatement")),
        },
      ];
    }
    case "POST_DEATH_IT_AE": {
      const calculation = asRecord(output.calculation);
      const summary = asRecord(calculation.summary);

      return [
        {
          label: "Taxable income",
          value: formatCurrency(readNumber(summary, "taxableIncome")),
        },
        {
          label: "Applied rate",
          value: formatPercent(readNumber(summary, "appliedRate")),
        },
        {
          label: "Tax payable",
          value: formatCurrency(readNumber(summary, "taxPayable")),
        },
      ];
    }
    default:
      return [];
  }
}
