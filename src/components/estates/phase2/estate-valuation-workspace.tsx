import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EstateReportActions } from "@/components/estates/phase2/estate-report-actions";
import { EstateValuationReport as EstateValuationReportView } from "@/components/reports/estates/valuation-report";
import type { EstateEngineRunRecord } from "@/modules/estates/engines/types";
import { saTaxYearFromDate } from "@/lib/utils";
import { formatValuationMethodLabel } from "@/modules/estates/phase2/workspace-helpers";
import type { EstateValuationReport } from "@/modules/estates/engines/valuation/types";
import type { EstateDetailRecord } from "@/modules/estates/types";

type WorkspaceAction = string | ((formData: FormData) => void | Promise<void>);

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function buildSupportCheckbox(
  name: string,
  label: string,
  defaultChecked = false,
  disabled = false,
) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="h-4 w-4 rounded border-slate-300 text-teal-700"
      />
      <span>{label}</span>
    </label>
  );
}

function buildMethodCheckbox(value: string, label: string, defaultChecked = true) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
      <input
        type="checkbox"
        name="enabledMethods"
        value={value}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-slate-300 text-teal-700"
      />
      <span>{label}</span>
    </label>
  );
}

function buildMoneyInput(name: string, defaultValue: string | number) {
  return (
    <input
      type="number"
      name={name}
      step="0.01"
      inputMode="decimal"
      defaultValue={defaultValue}
      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
    />
  );
}

export function EstateValuationWorkspace({
  estate,
  run,
  report,
  submitAction,
  errorMessage,
}: {
  estate: EstateDetailRecord;
  run: EstateEngineRunRecord | null;
  report: EstateValuationReport | null;
  submitAction: WorkspaceAction;
  errorMessage?: string;
}) {
  const businessAssets = estate.assets.filter((asset) => asset.category === "BUSINESS_INTEREST");
  const primaryAsset = businessAssets[0];
  const taxYear = saTaxYearFromDate(estate.dateOfDeath);
  const isEmpty = businessAssets.length === 0;
  const latestMethods = report?.reconciliation?.methods?.map((method) => formatValuationMethodLabel(method.method));

  return (
    <section className="grid gap-4 xl:grid-cols-[1.1fr,1fr]">
      <Card>
        <CardTitle>Perform valuation</CardTitle>
        <CardDescription className="mt-1">
          Capture the business-interest valuation inputs, supporting SARS evidence, and notes for
          the estate file.
        </CardDescription>

        {isEmpty ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Add a business-interest asset to the estate register before running a valuation.
          </p>
        ) : (
          <form action={submitAction} className="mt-4 space-y-5">
            <input type="hidden" name="taxYear" value={taxYear} />

            {errorMessage ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {errorMessage}
              </div>
            ) : null}

            <section className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Mandate and subject profile</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Set the valuation date, subject context, and the method mix to apply.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm text-slate-700">
                  <span>Business-interest asset</span>
                  <select
                    name="assetId"
                    aria-label="Business-interest asset"
                    defaultValue={primaryAsset?.id}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    required
                  >
                    {businessAssets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.description}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-sm text-slate-700">
                  <span>Valuation date</span>
                  <input
                    type="date"
                    name="valuationDate"
                    aria-label="Valuation date"
                    defaultValue={estate.dateOfDeath}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </label>

                <label className="space-y-1 text-sm text-slate-700">
                  <span>Subject description</span>
                  <input
                    type="text"
                    name="subjectDescription"
                    aria-label="Subject description"
                    defaultValue={primaryAsset?.description ?? ""}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </label>

                <label className="space-y-1 text-sm text-slate-700">
                  <span>Method</span>
                  <select
                    name="method"
                    aria-label="Method"
                    defaultValue="DISCOUNTED_CASH_FLOW"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    required
                  >
                    <option value="DISCOUNTED_CASH_FLOW">Discounted cash flow (DCF)</option>
                    <option value="MAINTAINABLE_EARNINGS">Maintainable earnings</option>
                    <option value="NET_ASSET_VALUE">Net asset value (NAV)</option>
                  </select>
                </label>

                <label className="space-y-1 text-sm text-slate-700">
                  <span>Subject type</span>
                  <select
                    name="subjectType"
                    defaultValue="COMPANY_SHAREHOLDING"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="COMPANY_SHAREHOLDING">Company shareholding</option>
                    <option value="SOLE_PROPRIETORSHIP">Sole proprietorship</option>
                  </select>
                </label>

                <label className="space-y-1 text-sm text-slate-700">
                  <span>Shareholding percentage</span>
                  <input
                    type="number"
                    name="shareholdingPercentage"
                    min="0"
                    max="100"
                    step="0.01"
                    defaultValue="100"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-1 text-sm text-slate-700">
                  <span>Registration number</span>
                  <input
                    type="text"
                    name="registrationNumber"
                    defaultValue=""
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-1 text-sm text-slate-700">
                  <span>Industry</span>
                  <input
                    type="text"
                    name="industry"
                    defaultValue=""
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-900">Enabled methods</p>
                <div className="grid gap-3 md:grid-cols-3">
                  {buildMethodCheckbox("DISCOUNTED_CASH_FLOW", "Discounted cash flow (DCF)")}
                  {buildMethodCheckbox("MAINTAINABLE_EARNINGS", "Maintainable earnings")}
                  {buildMethodCheckbox("NET_ASSET_VALUE", "Net asset value (NAV)")}
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Historical financial analysis</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Capture high-level historical performance to support the report narrative.
                </p>
              </div>
              <div className="grid gap-3">
                {[0, 1, 2].map((index) => (
                  <div key={`historical-${index}`} className="grid gap-3 md:grid-cols-5">
                    <input
                      type="text"
                      name={`historicalLabel_${index}`}
                      defaultValue={["FY2023", "FY2024", "FY2025"][index]}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                    {buildMoneyInput(`historicalRevenue_${index}`, ["18450000", "21200000", "24600000"][index])}
                    {buildMoneyInput(`historicalEbitda_${index}`, ["3500000", "4350000", "5300000"][index])}
                    {buildMoneyInput(`historicalEbit_${index}`, ["3050000", "3850000", "4750000"][index])}
                    {buildMoneyInput(`historicalNpat_${index}`, ["2022000", "2635000", "3321000"][index])}
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Discounted cash flow (DCF)</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Forecast free cash flow to the business and discount it using WACC assumptions.
                </p>
              </div>
              <div className="grid gap-3">
                {[0, 1, 2, 3, 4].map((index) => (
                  <div key={`dcf-${index}`} className="grid gap-3 md:grid-cols-6">
                    <input
                      type="text"
                      name={`dcfForecastLabel_${index}`}
                      defaultValue={["FY2026", "FY2027", "FY2028", "FY2029", "FY2030"][index]}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                    {buildMoneyInput(`dcfRevenue_${index}`, ["26500000", "28600000", "30600000", "32400000", "34000000"][index])}
                    {buildMoneyInput(`dcfEbit_${index}`, ["5000000", "5450000", "5900000", "6250000", "6600000"][index])}
                    {buildMoneyInput(`dcfDepreciation_${index}`, ["600000", "650000", "700000", "750000", "800000"][index])}
                    {buildMoneyInput(`dcfCapex_${index}`, ["800000", "850000", "900000", "950000", "1000000"][index])}
                    {buildMoneyInput(`dcfWorkingCapitalChange_${index}`, ["250000", "200000", "180000", "160000", "140000"][index])}
                  </div>
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                {buildMoneyInput("dcfRiskFreeRate", "0.105")}
                {buildMoneyInput("dcfEquityRiskPremium", "0.065")}
                {buildMoneyInput("dcfBeta", "0.92")}
                {buildMoneyInput("dcfSmallCompanyPremium", "0.03")}
                {buildMoneyInput("dcfKeyPersonPremium", "0.02")}
                {buildMoneyInput("dcfCostOfDebt", "0.1175")}
                {buildMoneyInput("dcfDebtWeight", "0.10")}
                {buildMoneyInput("dcfEquityWeight", "0.90")}
                {buildMoneyInput("dcfTaxRate", "0.27")}
                {buildMoneyInput("dcfPerpetualGrowthRate", "0.05")}
                {buildMoneyInput("dcfTerminalExitMultiple", "4.5")}
                {buildMoneyInput("dcfCashAndEquivalents", "2200000")}
                {buildMoneyInput("dcfInterestBearingDebt", "650000")}
                {buildMoneyInput("dcfDirectorLoan", "850000")}
                {buildMoneyInput("dcfMarketabilityDiscountRate", "0.15")}
                {buildMoneyInput("dcfMinorityDiscountRate", "0")}
              </div>
            </section>

            <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Maintainable earnings</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Normalise historical earnings and apply a supportable private-company multiple.
                </p>
              </div>
              <div className="grid gap-3">
                {[0, 1, 2].map((index) => (
                  <div key={`earnings-${index}`} className="grid gap-3 md:grid-cols-5">
                    <input
                      type="text"
                      name={`earningsLabel_${index}`}
                      defaultValue={["FY2023", "FY2024", "FY2025"][index]}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                    {buildMoneyInput(`earningsReportedNpat_${index}`, ["2022000", "2635000", "3321000"][index])}
                    {buildMoneyInput(`earningsNonRecurringAdjustments_${index}`, ["205000", "-180000", "0"][index])}
                    {buildMoneyInput(`earningsOwnerRemunerationAdjustment_${index}`, ["-200000", "-200000", "-200000"][index])}
                    {buildMoneyInput(`earningsWeighting_${index}`, ["1", "2", "3"][index])}
                  </div>
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {buildMoneyInput("earningsSelectedMultiple", "4.8")}
                {buildMoneyInput("earningsMarketabilityDiscountRate", "0")}
                {buildMoneyInput("earningsMinorityDiscountRate", "0")}
              </div>
            </section>

            <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Adjusted net asset value</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Capture major asset and liability adjustments to fair market value.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-900">Assets</p>
                {[0, 1, 2, 3, 4].map((index) => (
                  <div key={`nav-asset-${index}`} className="grid gap-3 md:grid-cols-3">
                    <input
                      type="text"
                      name={`navAssetCategory_${index}`}
                      defaultValue={["Property", "Plant & equipment", "Inventory", "Trade receivables", "Cash and equivalents"][index]}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                    {buildMoneyInput(`navAssetBookValue_${index}`, ["3200000", "1600000", "2400000", "3500000", "2200000"][index])}
                    {buildMoneyInput(`navAssetAdjustment_${index}`, ["2800000", "400000", "-200000", "-350000", "0"][index])}
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-900">Liabilities</p>
                {[0, 1, 2, 3, 4].map((index) => (
                  <div key={`nav-liability-${index}`} className="grid gap-3 md:grid-cols-3">
                    <input
                      type="text"
                      name={`navLiabilityCategory_${index}`}
                      defaultValue={["Long-term borrowings", "Short-term borrowings", "Trade payables", "Director's loan", "Deferred tax"][index]}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                    {buildMoneyInput(`navLiabilityBookValue_${index}`, ["400000", "250000", "1150000", "850000", "0"][index])}
                    {buildMoneyInput(`navLiabilityAdjustment_${index}`, ["0", "0", "0", "0", "750000"][index])}
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Reconciliation and conclusion</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Weight the methods and define the rounding convention for the concluded value.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                {buildMoneyInput("weightDiscountedCashFlow", "0.40")}
                {buildMoneyInput("weightMaintainableEarnings", "0.35")}
                {buildMoneyInput("weightNetAssetValue", "0.25")}
                {buildMoneyInput("conclusionRounding", "50000")}
              </div>
              <label className="space-y-1 text-sm text-slate-700">
                <span>Reconciliation rationale</span>
                <textarea
                  name="reconciliationRationale"
                  defaultValue="The concluded value reflects a weighted reconciliation of DCF, maintainable earnings, and adjusted NAV based on their relevance and reliability."
                  className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </section>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Sources of information</span>
              <textarea
                name="sourcesOfInformation"
                defaultValue={`Annual financial statements for FY2023 to FY2025
Management accounts to valuation date
Fixed asset register
Debtor and creditor age analysis
Industry reports and market data`}
                className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Assumptions</span>
              <textarea
                name="assumptions"
                defaultValue={`Management representations and estate records provided.
Business assumed to continue as a going concern.
No post-valuation-date legislative changes reflected.`}
                className="min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </label>

            <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Support pack inputs</h3>
              <p className="mt-1 text-sm text-slate-600">
                Confirm the supporting documents held for unlisted-share or member-interest
                valuations.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {buildSupportCheckbox(
                  "latestAnnualFinancialStatementsOnFile",
                  "Latest AFS on file",
                  true,
                )}
                {buildSupportCheckbox(
                  "priorYearAnnualFinancialStatementsOnFile",
                  "Prior year AFS on file",
                  true,
                )}
                {buildSupportCheckbox(
                  "twoYearsPriorAnnualFinancialStatementsOnFile",
                  "Two years prior AFS on file",
                  true,
                )}
                {buildSupportCheckbox(
                  "executorAuthorityOnFile",
                  "Executor authority on file",
                  true,
                )}
                {buildSupportCheckbox(
                  "acquisitionDocumentsOnFile",
                  "Acquisition documents on file",
                  true,
                )}
                {buildSupportCheckbox("rev246Required", "REV246 required")}
                {buildSupportCheckbox("rev246Included", "REV246 included")}
                {buildSupportCheckbox("patentValuationRequired", "Patent valuation required")}
                {buildSupportCheckbox("patentValuationIncluded", "Patent valuation included")}
              </div>
            </section>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Report notes</span>
              <textarea
                name="reportNotes"
                defaultValue={`Prepared for ${estate.estateReference} to support the estate file.`}
                className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p>Applicable tax year: {taxYear}</p>
              <button
                type="submit"
                className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#12344a]"
              >
                Run Valuation
              </button>
            </div>
          </form>
        )}
      </Card>

      <div className="space-y-4">
        <Card>
          <CardTitle>Current valuation status</CardTitle>
          <CardDescription className="mt-1">
            Review the latest valuation output and confirm the estate asset register is updated.
          </CardDescription>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <p>Business-interest assets in register: {businessAssets.length}</p>
            <p>
              Latest run status: {run ? formatLabel(run.status) : "No valuation run created"}
            </p>
            {report ? (
              <>
                <p>
                  Latest methods:{" "}
                  {latestMethods && latestMethods.length > 0
                    ? latestMethods.join(", ")
                    : formatValuationMethodLabel(report.summary.method)}
                </p>
                <p>
                  Latest concluded value: R{" "}
                  {report.summary.concludedValue.toLocaleString("en-ZA", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </>
            ) : null}
          </div>
          {report ? (
            <div className="mt-4">
              <EstateReportActions
                estateId={estate.id}
                taxYear={taxYear}
                artifactCode="BUSINESS_VALUATION_REPORT"
                renderFormat="pdf"
                resourceLabel="Business valuation report"
                actions={[
                  { kind: "download", label: "Download PDF", tone: "primary" },
                  { kind: "open", label: "Open PDF" },
                  { kind: "print", label: "Print PDF" },
                ]}
              />
            </div>
          ) : null}
        </Card>

        {report ? (
          <EstateValuationReportView report={report} />
        ) : (
          <Card>
            <CardTitle>Business valuation report</CardTitle>
            <CardDescription className="mt-1">
              Run a valuation to generate the formal report and update the linked estate asset.
            </CardDescription>
          </Card>
        )}
      </div>
    </section>
  );
}
