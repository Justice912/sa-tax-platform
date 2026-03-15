"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  emptyEstateCreateFormState,
  type EstateCreateFormState,
} from "@/modules/estates/create-form";

type EstateCreateAction = (
  state: EstateCreateFormState,
  formData: FormData,
) => EstateCreateFormState | Promise<EstateCreateFormState>;

interface EstateCreateWizardProps {
  action: EstateCreateAction;
  cancelHref: string;
  defaultDateOfDeath?: string;
  defaultAssignedPractitionerName?: string;
  initialState?: EstateCreateFormState;
}

function errorBorder(hasError: boolean) {
  return hasError ? "border-red-300 ring-1 ring-red-200" : "border-slate-300";
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs font-medium text-red-600">{message}</p>;
}

export function EstateCreateWizard({
  action,
  cancelHref,
  defaultDateOfDeath,
  defaultAssignedPractitionerName = "Sipho Ndlovu",
  initialState = emptyEstateCreateFormState,
}: EstateCreateWizardProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.message}
        </div>
      ) : null}

      <Card>
        <CardTitle>Deceased Details</CardTitle>
        <CardDescription className="mt-1">
          Capture the identity, tax, and marital-regime details needed to open the estate matter.
        </CardDescription>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-medium">Deceased full name</span>
            <input
              name="deceasedName"
              required
              aria-invalid={Boolean(state.fieldErrors.deceasedName)}
              className={`w-full rounded-md border px-3 py-2 text-sm ${errorBorder(Boolean(state.fieldErrors.deceasedName))}`}
              placeholder="Estate Late Sarah Molefe"
            />
            <FieldError message={state.fieldErrors.deceasedName} />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-medium">ID or passport number</span>
            <input
              name="idNumberOrPassport"
              required
              aria-invalid={Boolean(state.fieldErrors.idNumberOrPassport)}
              className={`w-full rounded-md border px-3 py-2 text-sm ${errorBorder(Boolean(state.fieldErrors.idNumberOrPassport))}`}
              placeholder="7001010155084"
            />
            <FieldError message={state.fieldErrors.idNumberOrPassport} />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-medium">Date of birth</span>
            <input
              type="date"
              name="dateOfBirth"
              aria-invalid={Boolean(state.fieldErrors.dateOfBirth)}
              className={`w-full rounded-md border px-3 py-2 text-sm ${errorBorder(Boolean(state.fieldErrors.dateOfBirth))}`}
            />
            <FieldError message={state.fieldErrors.dateOfBirth} />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-medium">Date of death</span>
            <input
              type="date"
              name="dateOfDeath"
              required
              defaultValue={defaultDateOfDeath}
              aria-invalid={Boolean(state.fieldErrors.dateOfDeath)}
              className={`w-full rounded-md border px-3 py-2 text-sm ${errorBorder(Boolean(state.fieldErrors.dateOfDeath))}`}
            />
            <FieldError message={state.fieldErrors.dateOfDeath} />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-medium">Marital regime</span>
            <select
              name="maritalRegime"
              defaultValue="UNKNOWN"
              aria-invalid={Boolean(state.fieldErrors.maritalRegime)}
              className={`w-full rounded-md border px-3 py-2 text-sm ${errorBorder(Boolean(state.fieldErrors.maritalRegime))}`}
            >
              <option value="UNKNOWN">Unknown / pending confirmation</option>
              <option value="IN_COMMUNITY">In community of property</option>
              <option value="OUT_OF_COMMUNITY_NO_ACCRUAL">Out of community (no accrual)</option>
              <option value="OUT_OF_COMMUNITY_ACCRUAL">Out of community (accrual)</option>
              <option value="CUSTOMARY">Customary marriage</option>
            </select>
            <FieldError message={state.fieldErrors.maritalRegime} />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-medium">Income tax number</span>
            <input
              name="taxNumber"
              minLength={10}
              maxLength={20}
              aria-invalid={Boolean(state.fieldErrors.taxNumber)}
              className={`w-full rounded-md border px-3 py-2 text-sm ${errorBorder(Boolean(state.fieldErrors.taxNumber))}`}
              placeholder="9001123456"
            />
            <FieldError message={state.fieldErrors.taxNumber} />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-medium">Estate tax number</span>
            <input
              name="estateTaxNumber"
              minLength={10}
              maxLength={20}
              aria-invalid={Boolean(state.fieldErrors.estateTaxNumber)}
              className={`w-full rounded-md border px-3 py-2 text-sm ${errorBorder(Boolean(state.fieldErrors.estateTaxNumber))}`}
              placeholder="9019988776"
            />
            <FieldError message={state.fieldErrors.estateTaxNumber} />
          </label>
          <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <input type="checkbox" name="hasWill" defaultChecked className="h-4 w-4 rounded border-slate-300" />
            <span className="font-medium">Valid will currently available</span>
          </label>
        </div>
      </Card>

      <Card>
        <CardTitle>Executor Details</CardTitle>
        <CardDescription className="mt-1">
          Capture the responsible executor or administrator and the contact details for estate updates.
        </CardDescription>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-medium">Executor name</span>
            <input
              name="executorName"
              required
              aria-invalid={Boolean(state.fieldErrors.executorName)}
              className={`w-full rounded-md border px-3 py-2 text-sm ${errorBorder(Boolean(state.fieldErrors.executorName))}`}
              placeholder="Kagiso Dlamini"
            />
            <FieldError message={state.fieldErrors.executorName} />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-medium">Executor capacity</span>
            <select
              name="executorCapacity"
              defaultValue="EXECUTOR_TESTAMENTARY"
              aria-invalid={Boolean(state.fieldErrors.executorCapacity)}
              className={`w-full rounded-md border px-3 py-2 text-sm ${errorBorder(Boolean(state.fieldErrors.executorCapacity))}`}
            >
              <option value="EXECUTOR_TESTAMENTARY">Executor testamentary</option>
              <option value="EXECUTOR_DATIVE">Executor dative</option>
              <option value="ADMINISTRATOR">Administrator</option>
            </select>
            <FieldError message={state.fieldErrors.executorCapacity} />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-medium">Executor email</span>
            <input
              type="email"
              name="executorEmail"
              aria-invalid={Boolean(state.fieldErrors.executorEmail)}
              className={`w-full rounded-md border px-3 py-2 text-sm ${errorBorder(Boolean(state.fieldErrors.executorEmail))}`}
              placeholder="executor@example.co.za"
            />
            <FieldError message={state.fieldErrors.executorEmail} />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-medium">Executor phone</span>
            <input
              name="executorPhone"
              aria-invalid={Boolean(state.fieldErrors.executorPhone)}
              className={`w-full rounded-md border px-3 py-2 text-sm ${errorBorder(Boolean(state.fieldErrors.executorPhone))}`}
              placeholder="+27 82 111 2222"
            />
            <FieldError message={state.fieldErrors.executorPhone} />
          </label>
        </div>
      </Card>

      <Card>
        <CardTitle>Matter Setup</CardTitle>
        <CardDescription className="mt-1">
          Capture ownership and working notes so the estate opens with the right practitioner and context.
        </CardDescription>
        <div className="mt-4 grid gap-4">
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-medium">Assigned practitioner</span>
            <input
              name="assignedPractitionerName"
              required
              defaultValue={defaultAssignedPractitionerName}
              aria-invalid={Boolean(state.fieldErrors.assignedPractitionerName)}
              className={`w-full rounded-md border px-3 py-2 text-sm md:max-w-sm ${errorBorder(Boolean(state.fieldErrors.assignedPractitionerName))}`}
            />
            <FieldError message={state.fieldErrors.assignedPractitionerName} />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-medium">Opening notes</span>
            <textarea
              name="notes"
              rows={4}
              aria-invalid={Boolean(state.fieldErrors.notes)}
              className={`w-full rounded-md border px-3 py-2 text-sm ${errorBorder(Boolean(state.fieldErrors.notes))}`}
              placeholder="Master file status, initial document pack, and immediate follow-ups."
            />
            <FieldError message={state.fieldErrors.notes} />
          </label>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link
          href={cancelHref}
          className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
        >
          Cancel
        </Link>
        <button
          disabled={isPending}
          className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#12344a] disabled:cursor-not-allowed disabled:opacity-70"
        >
          Save Estate
        </button>
      </div>
    </form>
  );
}
