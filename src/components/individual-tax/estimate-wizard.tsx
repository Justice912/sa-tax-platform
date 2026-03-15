"use client";

import { useMemo, useState } from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import type { ClientRecord } from "@/modules/shared/types";
import {
  buildDefaultNearEfilingInput,
  SUPPORTED_ASSESSMENT_YEARS,
  type NearEfilingEstimateFormValues,
} from "@/modules/individual-tax/near-efiling-form";
import type { NearEfilingIndividualTaxInput } from "@/modules/individual-tax/types";

type WizardMode = "create" | "edit";

interface EstimateWizardProps {
  mode: WizardMode;
  clients: Array<
    Pick<ClientRecord, "id" | "code" | "displayName" | "taxReferenceNumber">
  >;
  defaultClientId?: string;
  defaultValues: NearEfilingEstimateFormValues | null;
  action?: (formData: FormData) => void | Promise<void>;
  cancelHref?: string;
}

const steps = [
  "Taxpayer Profile",
  "Employment",
  "Travel",
  "Medical",
  "Other Income",
  "Deductions",
  "Review Estimate",
] as const;

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function buildInitialValues(props: EstimateWizardProps): NearEfilingEstimateFormValues {
  const initialClient = props.clients.find((client) => client.id === props.defaultClientId) ?? props.clients[0];
  const input = props.defaultValues?.input ?? buildDefaultNearEfilingInput();

  return {
    clientId: props.defaultValues?.clientId ?? initialClient?.id ?? "",
    referenceNumber:
      props.defaultValues?.referenceNumber ??
      initialClient?.taxReferenceNumber ??
      "",
    taxpayerName:
      props.defaultValues?.taxpayerName ??
      initialClient?.displayName ??
      "",
    assessmentDate: props.defaultValues?.assessmentDate ?? todayIsoDate(),
    input,
  };
}

function zarc(value: number) {
  return `R ${value.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function FieldShell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function inputClassName() {
  return "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";
}

export function EstimateWizard(props: EstimateWizardProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState<NearEfilingEstimateFormValues>(() =>
    buildInitialValues(props),
  );

  const clientMap = useMemo(
    () => new Map(props.clients.map((client) => [client.id, client])),
    [props.clients],
  );

  const currentStep = steps[stepIndex];
  const isReview = stepIndex === steps.length - 1;

  function updateValues(next: NearEfilingEstimateFormValues) {
    setValues(next);
  }

  function handleClientChange(clientId: string) {
    const client = clientMap.get(clientId);
    updateValues({
      ...values,
      clientId,
      referenceNumber:
        values.referenceNumber || client?.taxReferenceNumber || "",
      taxpayerName: values.taxpayerName || client?.displayName || "",
    });
  }

  function updateInput(nextInput: NearEfilingIndividualTaxInput) {
    updateValues({
      ...values,
      input: nextInput,
    });
  }

  function goToPrevious() {
    setStepIndex((index) => Math.max(0, index - 1));
  }

  function goToNext() {
    setStepIndex((index) => Math.min(steps.length - 1, index + 1));
  }

  return (
    <form action={props.action} className="space-y-6">
      <PersistedHiddenFields values={values} />

      <Card>
        <CardTitle>
          {props.mode === "create"
            ? "Near-eFiling Estimate Setup"
            : "Edit Near-eFiling Estimate"}
        </CardTitle>
        <CardDescription className="mt-1">
          Capture the taxpayer profile and schedules needed to estimate the SARS
          outcome before eFiling submission.
        </CardDescription>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FieldShell label="Client">
            <select
              name="clientId"
              value={values.clientId}
              onChange={(event) => handleClientChange(event.target.value)}
              className={inputClassName()}
              required
            >
              {props.clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.displayName} ({client.code})
                </option>
              ))}
            </select>
          </FieldShell>

          <FieldShell label="Reference Number">
            <input
              type="text"
              name="referenceNumber"
              value={values.referenceNumber}
              onChange={(event) =>
                updateValues({ ...values, referenceNumber: event.target.value })
              }
              className={inputClassName()}
              required
            />
          </FieldShell>

          <FieldShell label="Taxpayer Name">
            <input
              type="text"
              name="taxpayerName"
              value={values.taxpayerName}
              onChange={(event) =>
                updateValues({ ...values, taxpayerName: event.target.value })
              }
              className={inputClassName()}
              required
            />
          </FieldShell>

          <FieldShell label="Assessment Date">
            <input
              type="date"
              name="assessmentDate"
              value={values.assessmentDate}
              onChange={(event) =>
                updateValues({ ...values, assessmentDate: event.target.value })
              }
              className={inputClassName()}
              required
            />
          </FieldShell>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>{currentStep}</CardTitle>
            <CardDescription className="mt-1">
              Step {stepIndex + 1} of {steps.length}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            {steps.map((step, index) => (
              <span
                key={step}
                className={[
                  "rounded-full border px-3 py-1",
                  index === stepIndex
                    ? "border-[#0E2433] bg-[#0E2433] text-white"
                    : "border-slate-200 bg-slate-50",
                ].join(" ")}
              >
                {index + 1}. {step}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5">
          {stepIndex === 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FieldShell label="Assessment Year">
                <select
                  name="profile.assessmentYear"
                  value={values.input.profile.assessmentYear}
                  onChange={(event) =>
                    updateInput({
                      ...values.input,
                      profile: {
                        ...values.input.profile,
                        assessmentYear: Number(event.target.value) as NearEfilingIndividualTaxInput["profile"]["assessmentYear"],
                      },
                    })
                  }
                  className={inputClassName()}
                >
                  {SUPPORTED_ASSESSMENT_YEARS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </FieldShell>

              <FieldShell label="Date of Birth">
                <input
                  type="date"
                  name="profile.dateOfBirth"
                  value={values.input.profile.dateOfBirth}
                  onChange={(event) =>
                    updateInput({
                      ...values.input,
                      profile: {
                        ...values.input.profile,
                        dateOfBirth: event.target.value,
                      },
                    })
                  }
                  className={inputClassName()}
                  required
                />
              </FieldShell>

              <FieldShell label="Marital Status">
                <select
                  name="profile.maritalStatus"
                  value={values.input.profile.maritalStatus}
                  onChange={(event) =>
                    updateInput({
                      ...values.input,
                      profile: {
                        ...values.input.profile,
                        maritalStatus: event.target.value as NearEfilingIndividualTaxInput["profile"]["maritalStatus"],
                      },
                    })
                  }
                  className={inputClassName()}
                >
                  <option value="SINGLE">Single</option>
                  <option value="MARRIED_IN_COMMUNITY">Married in community</option>
                  <option value="MARRIED_OUT_OF_COMMUNITY">Married out of community</option>
                  <option value="WIDOWED">Widowed</option>
                  <option value="DIVORCED">Divorced</option>
                </select>
              </FieldShell>

              <FieldShell label="Medical Aid Members">
                <input
                  type="number"
                  name="profile.medicalAidMembers"
                  min="1"
                  max="20"
                  value={values.input.profile.medicalAidMembers}
                  onChange={(event) =>
                    updateInput({
                      ...values.input,
                      profile: {
                        ...values.input.profile,
                        medicalAidMembers: Number(event.target.value || 0),
                      },
                    })
                  }
                  className={inputClassName()}
                />
              </FieldShell>

              <FieldShell label="Months on Medical Aid">
                <input
                  type="number"
                  name="profile.medicalAidMonths"
                  min="0"
                  max="12"
                  value={values.input.profile.medicalAidMonths}
                  onChange={(event) =>
                    updateInput({
                      ...values.input,
                      profile: {
                        ...values.input.profile,
                        medicalAidMonths: Number(event.target.value || 0),
                      },
                    })
                  }
                  className={inputClassName()}
                />
              </FieldShell>
            </div>
          ) : null}

          {stepIndex === 1 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <NumberField label="Salary Income" name="employment.salaryIncome" value={values.input.employment.salaryIncome} onChange={(amount) => updateInput({ ...values.input, employment: { ...values.input.employment, salaryIncome: amount } })} />
              <NumberField label="Bonus Income" name="employment.bonusIncome" value={values.input.employment.bonusIncome} onChange={(amount) => updateInput({ ...values.input, employment: { ...values.input.employment, bonusIncome: amount } })} />
              <NumberField label="Commission Income" name="employment.commissionIncome" value={values.input.employment.commissionIncome} onChange={(amount) => updateInput({ ...values.input, employment: { ...values.input.employment, commissionIncome: amount } })} />
              <NumberField label="Fringe Benefits" name="employment.fringeBenefits" value={values.input.employment.fringeBenefits} onChange={(amount) => updateInput({ ...values.input, employment: { ...values.input.employment, fringeBenefits: amount } })} />
              <NumberField label="Other Taxable Employment Income" name="employment.otherTaxableEmploymentIncome" value={values.input.employment.otherTaxableEmploymentIncome} onChange={(amount) => updateInput({ ...values.input, employment: { ...values.input.employment, otherTaxableEmploymentIncome: amount } })} />
              <NumberField label="PAYE Withheld" name="employment.payeWithheld" value={values.input.employment.payeWithheld} onChange={(amount) => updateInput({ ...values.input, employment: { ...values.input.employment, payeWithheld: amount } })} />
            </div>
          ) : null}

          {stepIndex === 2 ? (
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  name="travel.hasTravelAllowance"
                  checked={values.input.travel.hasTravelAllowance}
                  onChange={(event) =>
                    updateInput({
                      ...values.input,
                      travel: {
                        ...values.input.travel,
                        hasTravelAllowance: event.target.checked,
                      },
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                Includes Travel Allowance
              </label>

              {values.input.travel.hasTravelAllowance ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <NumberField label="Travel Allowance" name="travel.travelAllowance" value={values.input.travel.travelAllowance} onChange={(amount) => updateInput({ ...values.input, travel: { ...values.input.travel, travelAllowance: amount } })} />
                  <NumberField label="Business Kilometres" name="travel.businessKilometres" value={values.input.travel.businessKilometres} onChange={(amount) => updateInput({ ...values.input, travel: { ...values.input.travel, businessKilometres: amount } })} />
                  <NumberField label="Total Kilometres" name="travel.totalKilometres" value={values.input.travel.totalKilometres} onChange={(amount) => updateInput({ ...values.input, travel: { ...values.input.travel, totalKilometres: amount } })} />
                  <NumberField label="Vehicle Cost" name="travel.vehicleCost" value={values.input.travel.vehicleCost} onChange={(amount) => updateInput({ ...values.input, travel: { ...values.input.travel, vehicleCost: amount } })} />
                  <FieldShell label="Vehicle Purchase Date">
                    <input
                      type="date"
                      name="travel.vehiclePurchaseDate"
                      value={values.input.travel.vehiclePurchaseDate}
                      onChange={(event) =>
                        updateInput({
                          ...values.input,
                          travel: {
                            ...values.input.travel,
                            vehiclePurchaseDate: event.target.value,
                          },
                        })
                      }
                      className={inputClassName()}
                    />
                  </FieldShell>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Add travel allowance details when the taxpayer received a travel
                  allowance and has logbook evidence for a SARS travel claim.
                </div>
              )}
            </div>
          ) : null}

          {stepIndex === 3 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <NumberField label="Medical Scheme Contributions" name="medical.medicalSchemeContributions" value={values.input.medical.medicalSchemeContributions} onChange={(amount) => updateInput({ ...values.input, medical: { ...values.input.medical, medicalSchemeContributions: amount } })} />
              <NumberField label="Qualifying Out-of-Pocket Expenses" name="medical.qualifyingOutOfPocketExpenses" value={values.input.medical.qualifyingOutOfPocketExpenses} onChange={(amount) => updateInput({ ...values.input, medical: { ...values.input.medical, qualifyingOutOfPocketExpenses: amount } })} />
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  name="medical.disabilityFlag"
                  checked={values.input.medical.disabilityFlag}
                  onChange={(event) =>
                    updateInput({
                      ...values.input,
                      medical: {
                        ...values.input.medical,
                        disabilityFlag: event.target.checked,
                      },
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                Disability Flag Applies
              </label>
            </div>
          ) : null}

          {stepIndex === 4 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <NumberField label="Local Interest" name="interest.localInterest" value={values.input.interest.localInterest} onChange={(amount) => updateInput({ ...values.input, interest: { localInterest: amount } })} />
              <NumberField label="Gross Rental Income" name="rental.grossRentalIncome" value={values.input.rental.grossRentalIncome} onChange={(amount) => updateInput({ ...values.input, rental: { ...values.input.rental, grossRentalIncome: amount } })} />
              <NumberField label="Deductible Rental Expenses" name="rental.deductibleRentalExpenses" value={values.input.rental.deductibleRentalExpenses} onChange={(amount) => updateInput({ ...values.input, rental: { ...values.input.rental, deductibleRentalExpenses: amount } })} />
              <NumberField label="Gross Sole Proprietor Income" name="soleProprietor.grossBusinessIncome" value={values.input.soleProprietor.grossBusinessIncome} onChange={(amount) => updateInput({ ...values.input, soleProprietor: { ...values.input.soleProprietor, grossBusinessIncome: amount } })} />
              <NumberField label="Deductible Business Expenses" name="soleProprietor.deductibleBusinessExpenses" value={values.input.soleProprietor.deductibleBusinessExpenses} onChange={(amount) => updateInput({ ...values.input, soleProprietor: { ...values.input.soleProprietor, deductibleBusinessExpenses: amount } })} />
            </div>
          ) : null}

          {stepIndex === 5 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <NumberField label="Retirement Contributions" name="deductions.retirementContributions" value={values.input.deductions.retirementContributions} onChange={(amount) => updateInput({ ...values.input, deductions: { ...values.input.deductions, retirementContributions: amount } })} />
              <NumberField label="Donations Under Section 18A" name="deductions.donationsUnderSection18A" value={values.input.deductions.donationsUnderSection18A} onChange={(amount) => updateInput({ ...values.input, deductions: { ...values.input.deductions, donationsUnderSection18A: amount } })} />
              <NumberField label="Prior Assessment Debit or Credit" name="deductions.priorAssessmentDebitOrCredit" value={values.input.deductions.priorAssessmentDebitOrCredit} onChange={(amount) => updateInput({ ...values.input, deductions: { ...values.input.deductions, priorAssessmentDebitOrCredit: amount } })} min={undefined} />
            </div>
          ) : null}

          {isReview ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SummaryItem label="Assessment Year" value={String(values.input.profile.assessmentYear)} />
                <SummaryItem label="Medical Aid Members" value={String(values.input.profile.medicalAidMembers)} />
                <SummaryItem label="Salary Income" value={zarc(values.input.employment.salaryIncome)} />
                <SummaryItem label="PAYE Withheld" value={zarc(values.input.employment.payeWithheld)} />
                <SummaryItem label="Travel Allowance" value={values.input.travel.hasTravelAllowance ? zarc(values.input.travel.travelAllowance) : "Not included"} />
                <SummaryItem label="Local Interest" value={zarc(values.input.interest.localInterest)} />
                <SummaryItem label="Gross Rental Income" value={zarc(values.input.rental.grossRentalIncome)} />
                <SummaryItem label="Gross Sole Proprietor Income" value={zarc(values.input.soleProprietor.grossBusinessIncome)} />
                <SummaryItem label="Medical Out-of-Pocket" value={zarc(values.input.medical.qualifyingOutOfPocketExpenses)} />
                <SummaryItem label="Retirement Contributions" value={zarc(values.input.deductions.retirementContributions)} />
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Save this near-eFiling estimate to generate a pre-submission SARS
                calculation worksheet for client review.
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={goToPrevious}
              disabled={stepIndex === 0}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            {props.cancelHref ? (
              <a
                href={props.cancelHref}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300"
              >
                Cancel
              </a>
            ) : null}
          </div>

          {isReview ? (
            <button
              type="submit"
              className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#12344a]"
            >
              {props.mode === "create"
                ? "Save Near-eFiling Estimate"
                : "Update Near-eFiling Estimate"}
            </button>
          ) : (
            <button
              type="button"
              onClick={goToNext}
              className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#12344a]"
            >
              Next: {steps[stepIndex + 1]}
            </button>
          )}
        </div>
      </Card>
    </form>
  );
}

function PersistedHiddenFields({
  values,
}: {
  values: NearEfilingEstimateFormValues;
}) {
  return (
    <>
      <input type="hidden" name="clientId" value={values.clientId} />
      <input type="hidden" name="referenceNumber" value={values.referenceNumber} />
      <input type="hidden" name="taxpayerName" value={values.taxpayerName} />
      <input type="hidden" name="assessmentDate" value={values.assessmentDate} />

      <input
        type="hidden"
        name="profile.assessmentYear"
        value={String(values.input.profile.assessmentYear)}
      />
      <input
        type="hidden"
        name="profile.dateOfBirth"
        value={values.input.profile.dateOfBirth}
      />
      <input
        type="hidden"
        name="profile.maritalStatus"
        value={values.input.profile.maritalStatus}
      />
      <input
        type="hidden"
        name="profile.medicalAidMembers"
        value={String(values.input.profile.medicalAidMembers)}
      />
      <input
        type="hidden"
        name="profile.medicalAidMonths"
        value={String(values.input.profile.medicalAidMonths)}
      />

      <input
        type="hidden"
        name="employment.salaryIncome"
        value={String(values.input.employment.salaryIncome)}
      />
      <input
        type="hidden"
        name="employment.bonusIncome"
        value={String(values.input.employment.bonusIncome)}
      />
      <input
        type="hidden"
        name="employment.commissionIncome"
        value={String(values.input.employment.commissionIncome)}
      />
      <input
        type="hidden"
        name="employment.fringeBenefits"
        value={String(values.input.employment.fringeBenefits)}
      />
      <input
        type="hidden"
        name="employment.otherTaxableEmploymentIncome"
        value={String(values.input.employment.otherTaxableEmploymentIncome)}
      />
      <input
        type="hidden"
        name="employment.payeWithheld"
        value={String(values.input.employment.payeWithheld)}
      />

      <input
        type="hidden"
        name="travel.hasTravelAllowance"
        value={String(values.input.travel.hasTravelAllowance)}
      />
      <input
        type="hidden"
        name="travel.travelAllowance"
        value={String(values.input.travel.travelAllowance)}
      />
      <input
        type="hidden"
        name="travel.businessKilometres"
        value={String(values.input.travel.businessKilometres)}
      />
      <input
        type="hidden"
        name="travel.totalKilometres"
        value={String(values.input.travel.totalKilometres)}
      />
      <input
        type="hidden"
        name="travel.vehicleCost"
        value={String(values.input.travel.vehicleCost)}
      />
      <input
        type="hidden"
        name="travel.vehiclePurchaseDate"
        value={values.input.travel.vehiclePurchaseDate}
      />

      <input
        type="hidden"
        name="medical.medicalSchemeContributions"
        value={String(values.input.medical.medicalSchemeContributions)}
      />
      <input
        type="hidden"
        name="medical.qualifyingOutOfPocketExpenses"
        value={String(values.input.medical.qualifyingOutOfPocketExpenses)}
      />
      <input
        type="hidden"
        name="medical.disabilityFlag"
        value={String(values.input.medical.disabilityFlag)}
      />

      <input
        type="hidden"
        name="interest.localInterest"
        value={String(values.input.interest.localInterest)}
      />

      <input
        type="hidden"
        name="rental.grossRentalIncome"
        value={String(values.input.rental.grossRentalIncome)}
      />
      <input
        type="hidden"
        name="rental.deductibleRentalExpenses"
        value={String(values.input.rental.deductibleRentalExpenses)}
      />

      <input
        type="hidden"
        name="soleProprietor.grossBusinessIncome"
        value={String(values.input.soleProprietor.grossBusinessIncome)}
      />
      <input
        type="hidden"
        name="soleProprietor.deductibleBusinessExpenses"
        value={String(values.input.soleProprietor.deductibleBusinessExpenses)}
      />

      <input
        type="hidden"
        name="deductions.retirementContributions"
        value={String(values.input.deductions.retirementContributions)}
      />
      <input
        type="hidden"
        name="deductions.donationsUnderSection18A"
        value={String(values.input.deductions.donationsUnderSection18A)}
      />
      <input
        type="hidden"
        name="deductions.priorAssessmentDebitOrCredit"
        value={String(values.input.deductions.priorAssessmentDebitOrCredit)}
      />
    </>
  );
}

function NumberField({
  label,
  name,
  value,
  onChange,
  min = 0,
}: {
  label: string;
  name: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
}) {
  return (
    <FieldShell label={label}>
      <input
        type="number"
        name={name}
        step="0.01"
        min={min}
        value={value}
        onChange={(event) => onChange(Number(event.target.value || 0))}
        className={inputClassName()}
      />
    </FieldShell>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
