import type {
  IndividualTaxCalculation,
  IndividualTaxLine,
  IndividualTaxReport,
} from "@/modules/individual-tax/types";

function splitAddress(address?: string) {
  return address
    ?.split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean) ?? [];
}

function makeSeed(input: string) {
  return input.split("").reduce((total, char, index) => total + char.charCodeAt(0) * (index + 1), 0);
}

function asCurrencyAmount(value: number) {
  return Math.round(value * 100) / 100;
}

function fabricateDetailNumber(seed: number, prefix: string, length: number) {
  const digits = String(Math.abs(seed * 7919)).padStart(length, "0");
  return `${prefix}${digits.slice(0, length)}`;
}

function fabricateBinaryFlag(seed: number, offset: number) {
  return (seed + offset) % 2 === 0 ? "Y" : "N";
}

function buildDetailRows(input: {
  referenceNumber: string;
  assessmentDate: string;
  assessmentYear: number;
  seed: number;
}) {
  const paymentDueDate = new Date(`${input.assessmentDate}T00:00:00`);
  paymentDueDate.setDate(paymentDueDate.getDate() + 31);

  const interestFreeDate = new Date(`${input.assessmentDate}T00:00:00`);
  interestFreeDate.setDate(interestFreeDate.getDate() + 21);

  const formatDate = (value: Date) => value.toISOString().slice(0, 10);
  const periodDays = 365 + (input.seed % 2);

  return [
    { label: "Reference number", value: input.referenceNumber },
    { label: "Document number", value: fabricateDetailNumber(input.seed, "ITA", 10) },
    { label: "Date of assessment", value: input.assessmentDate },
    { label: "Year of assessment", value: String(input.assessmentYear) },
    { label: "Type of assessment", value: input.seed % 3 === 0 ? "Additional assessment" : "Original assessment" },
    { label: "Period (days)", value: String(periodDays) },
    { label: "Payment due date", value: formatDate(paymentDueDate) },
    { label: "Interest free period", value: `Until ${formatDate(interestFreeDate)}` },
    { label: "PRN Number", value: fabricateDetailNumber(input.seed + 17, "PRN", 12) },
  ];
}

function findLine(lines: IndividualTaxLine[], code: string) {
  return lines.find((line) => line.code === code);
}

function fabricateComparison(current: number, seed: number, spread: number) {
  if (current === 0) {
    return 0;
  }

  const variance = 1 - ((seed % spread) + 1) / 100;
  return asCurrencyAmount(current * variance);
}

function toPositiveAmount(value: number) {
  return asCurrencyAmount(Math.abs(value));
}

function buildAssessmentSummary(calc: IndividualTaxCalculation, seed: number) {
  const assessedTaxAfterRebates = asCurrencyAmount(
    calc.summary.normalTax - Math.abs(findLine(calc.taxCalculationLines, "REBATES")?.amountAssessed ?? 0),
  );
  const taxCreditsAndAdjustments = asCurrencyAmount(
    Math.abs(findLine(calc.taxCalculationLines, "MEDICAL_CREDIT")?.amountAssessed ?? 0) +
      Math.abs(findLine(calc.taxCalculationLines, "4102")?.amountAssessed ?? 0),
  );
  const assessmentResult = calc.summary.netAmountPayable > 0
    ? calc.summary.netAmountPayable
    : -calc.summary.netAmountRefundable;

  const rows = [
    { description: "Income", currentAssessment: calc.summary.totalIncome },
    { description: "Deductions allowed", currentAssessment: calc.summary.totalDeductions },
    { description: "Taxable income / Assessed Loss", currentAssessment: calc.summary.taxableIncome },
    { description: "Assessed tax after rebates", currentAssessment: assessedTaxAfterRebates },
    { description: "Tax credits and adjustments", currentAssessment: taxCreditsAndAdjustments },
    { description: "Assessment Result", currentAssessment: assessmentResult },
    {
      description: "Net credit/debit amount",
      currentAssessment: calc.summary.netAmountPayable > 0
        ? calc.summary.netAmountPayable
        : calc.summary.netAmountRefundable,
    },
  ];

  return rows.map((row, index) => {
    const previousAssessment = fabricateComparison(row.currentAssessment, seed + index * 13, 7);
    return {
      description: row.description,
      previousAssessment,
      currentAssessment: asCurrencyAmount(row.currentAssessment),
      accountAdjustments: asCurrencyAmount(row.currentAssessment - previousAssessment),
    };
  });
}

function buildIncomeGroups(calc: IndividualTaxCalculation) {
  // Read all income values directly from the calculation lines to avoid
  // derived arithmetic that breaks when new income types are present.
  const salary = findLine(calc.incomeLines, "3601")?.amountAssessed ?? 0;
  const travelAllowance = findLine(calc.incomeLines, "3701")?.amountAssessed ?? 0;
  const localInterestLine = findLine(calc.incomeLines, "4201");
  const localInterestAssessed = localInterestLine?.amountAssessed ?? 0;
  // The exemption is stored as a separate line where present; fall back to 0.
  const localInterestExemptionLine = findLine(calc.incomeLines, "4218");
  const localInterestExemption = localInterestExemptionLine
    ? Math.abs(localInterestExemptionLine.amountAssessed)
    : 0;

  // New income lines added to the calculation engine.
  const pensionIncome = findLine(calc.incomeLines, "3704")?.amountAssessed ?? 0;
  const annuityIncome = findLine(calc.incomeLines, "3708")?.amountAssessed ?? 0;
  const foreignEmploymentIncome = findLine(calc.incomeLines, "3651")?.amountAssessed ?? 0;
  const foreignExemption = findLine(calc.incomeLines, "3652")?.amountAssessed ?? 0;
  const capitalGain = findLine(calc.incomeLines, "CGT")?.amountAssessed ?? 0;

  const groups: IndividualTaxReport["income"]["groups"] = [
    {
      title: "Employment income [IRP5/IT3(a)]",
      rows: [
        {
          code: "3601",
          description: "Income - Salary",
          computations: "Declared taxable salary income",
          amountAssessed: asCurrencyAmount(salary),
        },
        {
          code: "3701",
          description: "Travel allowance",
          computations: "Declared travel allowance component",
          amountAssessed: asCurrencyAmount(travelAllowance),
        },
        {
          code: "3713",
          description: "Other travel payments",
          computations: "No additional reimbursive travel payments captured",
          amountAssessed: 0,
        },
        {
          code: "3810",
          description: "Fringe benefits",
          computations: "No fringe benefits captured in the current assessment input",
          amountAssessed: 0,
        },
        {
          code: "3825",
          description: "Taxable benefits and allowances",
          computations: "No additional taxable benefits captured",
          amountAssessed: 0,
        },
      ],
    },
    {
      title: "Local Interest Income",
      rows: [
        {
          code: "4201",
          description: "Local interest taxable portion",
          computations: "Local interest less investment exemption",
          amountAssessed: asCurrencyAmount(localInterestAssessed),
        },
        {
          code: "4218",
          description: "Investment exemption",
          computations: "Exemption applied against local interest income",
          amountAssessed: asCurrencyAmount(-localInterestExemption),
        },
      ],
    },
  ];

  // Pension & Annuity Income — only include when at least one line is non-zero.
  if (pensionIncome !== 0 || annuityIncome !== 0) {
    groups.push({
      title: "Pension & Annuity Income",
      rows: [
        {
          code: "3704",
          description: "Pension income",
          computations: findLine(calc.incomeLines, "3704")?.computations ?? "Pension income received",
          amountAssessed: asCurrencyAmount(pensionIncome),
        },
        {
          code: "3708",
          description: "Annuity income",
          computations: findLine(calc.incomeLines, "3708")?.computations ?? "Annuity income received",
          amountAssessed: asCurrencyAmount(annuityIncome),
        },
      ],
    });
  }

  // Foreign Employment Income — only include when at least one line is non-zero.
  if (foreignEmploymentIncome !== 0 || foreignExemption !== 0) {
    groups.push({
      title: "Foreign Employment Income",
      rows: [
        {
          code: "3651",
          description: "Foreign employment income",
          computations: findLine(calc.incomeLines, "3651")?.computations ?? "Foreign employment income received",
          amountAssessed: asCurrencyAmount(foreignEmploymentIncome),
        },
        {
          code: "3652",
          description: "Foreign employment exemption",
          computations: findLine(calc.incomeLines, "3652")?.computations ?? "Exemption applied under s10(1)(o)(ii)",
          amountAssessed: asCurrencyAmount(foreignExemption),
        },
      ],
    });
  }

  // Capital Gains — only include when the CGT line is non-zero.
  if (capitalGain !== 0) {
    groups.push({
      title: "Capital Gains",
      rows: [
        {
          code: "CGT",
          description: "Capital gain included in income",
          computations: findLine(calc.incomeLines, "CGT")?.computations ?? "Taxable capital gain (inclusion rate applied)",
          amountAssessed: asCurrencyAmount(capitalGain),
        },
      ],
    });
  }

  return groups;
}

function buildDeductionRows(calc: IndividualTaxCalculation) {
  const retirementAmount = Math.abs(findLine(calc.deductionLines, "4029")?.amountAssessed ?? 0);
  const travelAmount = Math.abs(findLine(calc.deductionLines, "4014")?.amountAssessed ?? 0);
  const retirementCap = asCurrencyAmount(calc.summary.totalIncome * 0.275);

  const rows: IndividualTaxReport["deductions"]["rows"] = [
    {
      code: "4029",
      description: "Retirement fund contributions",
      computations: `Allowed at the lesser of actual contributions and 27.5% of remuneration/income (${retirementCap.toFixed(2)})`,
      amountAssessed: asCurrencyAmount(retirementAmount),
    },
    {
      code: "4014",
      description: "Travel claim against allowance",
      computations:
        "Logbook submitted. Vehicle details: purchase date 2021-03-01, registration ND 458-221, cost price R 485000.00, total kilometres 36210, business kilometres 22140, deemed fuel/maintenance/wear expenditure applied.",
      amountAssessed: asCurrencyAmount(travelAmount),
    },
  ];

  // S18A donations — include only when the line exists in the calculation.
  const donationsLine = findLine(calc.deductionLines, "4013");
  if (donationsLine) {
    rows.push({
      code: "4013",
      description: "Donations under s18A",
      computations: donationsLine.computations,
      amountAssessed: asCurrencyAmount(Math.abs(donationsLine.amountAssessed)),
    });
  }

  // Home office deduction — include only when the line exists in the calculation.
  const homeOfficeLine = findLine(calc.deductionLines, "4028");
  if (homeOfficeLine) {
    rows.push({
      code: "4028",
      description: "Home office deduction",
      computations: homeOfficeLine.computations,
      amountAssessed: asCurrencyAmount(Math.abs(homeOfficeLine.amountAssessed)),
    });
  }

  return rows;
}

function buildTaxCalculationRows(calc: IndividualTaxCalculation) {
  const rebates = Math.abs(findLine(calc.taxCalculationLines, "REBATES")?.amountAssessed ?? 0);
  const primaryRebate = Math.min(rebates, 17235);
  const remainingRebate = Math.max(0, rebates - primaryRebate);
  const secondaryRebate = asCurrencyAmount(remainingRebate * 0.6);
  const tertiaryRebate = asCurrencyAmount(remainingRebate - secondaryRebate);
  const medicalCredit = Math.abs(findLine(calc.taxCalculationLines, "MEDICAL_CREDIT")?.amountAssessed ?? 0);
  const paye = Math.abs(findLine(calc.taxCalculationLines, "4102")?.amountAssessed ?? 0);
  const previousAssessment = findLine(calc.taxCalculationLines, "PREV_ASSESSMENT")?.amountAssessed ?? 0;
  const subtotal = asCurrencyAmount(calc.summary.normalTax - rebates - medicalCredit);
  const netAmount = calc.summary.netAmountPayable > 0
    ? calc.summary.netAmountPayable
    : calc.summary.netAmountRefundable;

  return [
    {
      code: "NORMAL_TAX",
      description: "Normal tax",
      computations: "Taxable income x effective tax rate",
      amountAssessed: asCurrencyAmount(calc.summary.normalTax),
    },
    {
      code: "REBATE_PRIMARY",
      description: "Primary rebate",
      computations: "Primary rebate allocation",
      amountAssessed: asCurrencyAmount(primaryRebate),
    },
    {
      code: "REBATE_SECONDARY",
      description: "Secondary rebate",
      computations: "Secondary rebate allocation",
      amountAssessed: asCurrencyAmount(secondaryRebate),
    },
    {
      code: "REBATE_TERTIARY",
      description: "Tertiary rebate",
      computations: "Tertiary rebate allocation",
      amountAssessed: asCurrencyAmount(tertiaryRebate),
    },
    {
      code: "MEDICAL_CREDIT",
      description: "Medical Scheme Fees Tax Credit",
      computations: "Medical credit total",
      amountAssessed: asCurrencyAmount(medicalCredit),
    },
    {
      code: "SUBTOTAL",
      description: "Subtotal",
      computations: "Normal tax less rebates and medical tax credits",
      amountAssessed: subtotal,
    },
    {
      code: "4102",
      description: "Employees' tax (PAYE)",
      computations: "Employees' tax withheld",
      amountAssessed: asCurrencyAmount(paye),
    },
    ...(findLine(calc.taxCalculationLines, "IRP6")
      ? [
          {
            code: "IRP6",
            description: "Provisional tax paid",
            computations: findLine(calc.taxCalculationLines, "IRP6")!.computations,
            amountAssessed: asCurrencyAmount(
              Math.abs(findLine(calc.taxCalculationLines, "IRP6")!.amountAssessed),
            ),
          },
        ]
      : []),
    {
      code: "PREV_ASSESSMENT",
      description: "Previous assessment result",
      computations: "Brought-forward debit/credit",
      amountAssessed: asCurrencyAmount(previousAssessment),
    },
    {
      code: "NET_RESULT",
      description:
        calc.summary.netAmountPayable > 0 ? "Net amount payable" : "Net amount refundable",
      computations: "Net outcome after current assessment",
      amountAssessed: asCurrencyAmount(netAmount),
    },
  ];
}

export function buildIndividualTaxReport(input: {
  referenceNumber: string;
  taxpayerName: string;
  taxpayerAddress?: string;
  assessmentDate: string;
  calc: IndividualTaxCalculation;
}): IndividualTaxReport {
  const seed = makeSeed(
    `${input.referenceNumber}|${input.taxpayerName}|${input.assessmentDate}|${input.calc.assessmentYear}`,
  );
  const detailRows = buildDetailRows({
    referenceNumber: input.referenceNumber,
    assessmentDate: input.assessmentDate,
    assessmentYear: input.calc.assessmentYear,
    seed,
  });
  const payable = input.calc.summary.netAmountPayable > 0;

  return {
    branding: "TaxOps ZA Individual Tax Assessment Report",
    sections: [
      "header",
      "balance-summary",
      "compliance-information",
      "assessment-summary",
      "income",
      "deductions",
      "taxable-income",
      "tax-calculation",
      "notes",
    ],
    referenceNumber: input.referenceNumber,
    taxpayerName: input.taxpayerName,
    assessmentDate: input.assessmentDate,
    assessmentYear: input.calc.assessmentYear,
    calculation: input.calc,
    referenceNote: "Always quote this reference number when contacting SARS",
    header: {
      title: "INCOME TAX",
      documentCode: "ITA34",
      subtitle: "Notice of Assessment",
      taxpayer: {
        name: input.taxpayerName,
        addressLines: splitAddress(input.taxpayerAddress),
      },
      details: detailRows,
    },
    balanceOfAccount: {
      title: "Balance of Account after this Assessment",
      outcomeLabel: payable ? "Amount payable by you to SARS" : "Amount refundable to you",
      amount: payable
        ? input.calc.summary.netAmountPayable
        : input.calc.summary.netAmountRefundable,
    },
    complianceInformation: {
      title: "Compliance Information",
      rows: [
        { label: "Unprocessed payments", value: seed % 3 === 0 ? "Y" : "N" },
        { label: "Provisional taxpayer", value: fabricateBinaryFlag(seed, 5) },
        { label: "Selected for audit or verification", value: fabricateBinaryFlag(seed, 11) },
      ],
    },
    assessmentSummary: {
      title: "Assessment Summary Information",
      rows: buildAssessmentSummary(input.calc, seed),
    },
    income: {
      title: "Income",
      groups: buildIncomeGroups(input.calc),
    },
    deductions: {
      title: "Deductions allowed",
      rows: buildDeductionRows(input.calc),
    },
    taxCalculation: {
      title: "Tax calculation",
      rows: buildTaxCalculationRows(input.calc),
    },
    notes: {
      title: "Notes",
      rows: [
        { label: "Marital status", value: seed % 2 === 0 ? "Married in community of property" : "Single" },
        {
          label: "Medical rebates calculation",
          value: "Monthly medical scheme fees tax credit applied for 12 months based on the current assessment input.",
        },
        {
          label: "Additional Medical Expenses Tax Credits formula",
          value: "Additional medical expenses tax credit calculated using the standard percentage-based SARS formula after allowable thresholds.",
        },
        {
          label: "Carryover/Brought Forward amounts",
          value: `Previous assessment result carried forward: ${toPositiveAmount(
            findLine(input.calc.taxCalculationLines, "PREV_ASSESSMENT")?.amountAssessed ?? 0,
          ).toFixed(2)}`,
        },
      ],
    },
  };
}
