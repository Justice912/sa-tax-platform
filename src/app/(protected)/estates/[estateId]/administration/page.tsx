import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { LdAccountView } from "@/components/estates/ld-account-view";
import { getEstateById } from "@/modules/estates/service";
import { getEstateLdAccount, initialiseEstateWorkflow } from "@/modules/estates/workflow/service";
import { listSarsObligations, upsertAdministration, upsertSarsObligation } from "@/modules/estates/workflow/store";
import type { LdWorkpaper } from "@/modules/estates/workflow/types";

export const dynamic = "force-dynamic";

const input = "rounded-md border border-slate-300 px-3 py-2 text-sm";
const btn = "rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700";

export default async function EstateAdministrationPage({
  params,
  searchParams,
}: {
  params: Promise<{ estateId: string }>;
  searchParams?: Promise<{ error?: string }>;
}) {
  const { estateId } = await params;
  const query = (await searchParams) ?? {};
  const estate = await getEstateById(estateId);
  if (!estate) notFound();

  const { result, administration } = await getEstateLdAccount(estateId);
  let obligations = await listSarsObligations(estateId);
  if (obligations.length === 0) {
    await initialiseEstateWorkflow(estateId);
    obligations = await listSarsObligations(estateId);
  }
  const path = `/estates/${estateId}/administration`;
  const wp = administration.workpaper;

  async function saveAdministrationAction(formData: FormData) {
    "use server";
    const text = (k: string) => String(formData.get(k) ?? "").trim() || undefined;
    let workpaper: LdWorkpaper | undefined;
    const raw = text("workpaperJson");
    if (raw) {
      try {
        workpaper = JSON.parse(raw) as LdWorkpaper;
      } catch {
        redirect(`${path}?error=${encodeURIComponent("Workpaper JSON is not valid JSON.")}`);
      }
    }
    await upsertAdministration(estateId, {
      administrationType: (text("administrationType") as never) ?? "SOLVENT",
      masterReference: text("masterReference"),
      masterOffice: text("masterOffice"),
      lettersOfExecutorshipDate: text("lettersOfExecutorshipDate"),
      sarsCaseNumber: text("sarsCaseNumber"),
      incomeTaxReference: text("incomeTaxReference"),
      estateTaxReference: text("estateTaxReference"),
      workpaper: {
        ...(workpaper ?? {}),
        accountKind: (text("accountKind") as never) ?? workpaper?.accountKind,
        residentialAddress: text("residentialAddress") ?? workpaper?.residentialAddress,
        maritalStatus: (text("maritalStatus") as never) ?? workpaper?.maritalStatus,
        spouseName: text("spouseName") ?? workpaper?.spouseName,
      },
    });
    revalidatePath(path);
  }

  async function updateObligationAction(formData: FormData) {
    "use server";
    await upsertSarsObligation(estateId, String(formData.get("code")), {
      status: String(formData.get("status")) as never,
      reference: String(formData.get("reference") ?? "") || undefined,
      amount: formData.get("amount") ? Number(formData.get("amount")) : undefined,
    });
    revalidatePath(path);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Estate Administration · L&amp;D · SARS</h1>
          <p className="text-sm text-slate-600">{estate.deceasedName} | {estate.estateReference}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className={btn} href={`/api/v1/estates/${estateId}/ld?format=docx`}>Download L&amp;D (Word)</a>
          <a className={btn} href={`/api/v1/estates/${estateId}/packs/master`}>Master pack (ZIP)</a>
          <a className={btn} href={`/api/v1/estates/${estateId}/packs/sars`}>SARS pack (ZIP)</a>
          <Link className={btn} href={`/estates/${estateId}/documents`}>Documents</Link>
          <Link className={btn} href={`/estates/${estateId}`}>Back to Estate</Link>
        </div>
      </div>
      {query.error ? <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{query.error}</p> : null}

      <Card>
        <CardTitle>Administration details</CardTitle>
        <CardDescription className="mt-1">Drives the Reg 5 heading, the administration route (s18(3), solvent, s34) and SARS file naming.</CardDescription>
        <form action={saveAdministrationAction} className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-sm">Administration route
            <select name="administrationType" defaultValue={administration.administrationType} className={`${input} w-full`}>
              <option value="SOLVENT">Solvent estate (L&amp;D account)</option>
              <option value="SMALL_ESTATE_S18_3">Section 18(3) — under R250 000</option>
              <option value="INSOLVENT_S34">Insolvent — section 34</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">Account
            <select name="accountKind" defaultValue={wp.accountKind ?? "FIRST_AND_FINAL"} className={`${input} w-full`}>
              <option value="FIRST_AND_FINAL">First and Final</option>
              <option value="FIRST_INTERIM">First Interim</option>
              <option value="SUPPLEMENTARY">Supplementary</option>
              <option value="AMENDED_FIRST_AND_FINAL">Amended First and Final</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">Marital status at death
            <select name="maritalStatus" defaultValue={wp.maritalStatus ?? ""} className={`${input} w-full`}>
              <option value="">From estate record ({estate.maritalRegime})</option>
              <option value="NEVER_MARRIED">Never married</option>
              <option value="WIDOWED">Widowed</option>
              <option value="DIVORCED">Divorced</option>
              <option value="IN_COMMUNITY">In community of property</option>
              <option value="OUT_OF_COMMUNITY_NO_ACCRUAL">Out of community, no accrual</option>
              <option value="OUT_OF_COMMUNITY_ACCRUAL">Out of community, accrual</option>
              <option value="CUSTOMARY">Customary marriage</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">Master&apos;s reference<input name="masterReference" defaultValue={administration.masterReference} className={`${input} w-full`} /></label>
          <label className="space-y-1 text-sm">Master&apos;s office<input name="masterOffice" defaultValue={administration.masterOffice} className={`${input} w-full`} placeholder="e.g. Durban" /></label>
          <label className="space-y-1 text-sm">Letters issued on<input type="date" name="lettersOfExecutorshipDate" defaultValue={administration.lettersOfExecutorshipDate} className={`${input} w-full`} /></label>
          <label className="space-y-1 text-sm">SARS estate case number<input name="sarsCaseNumber" defaultValue={administration.sarsCaseNumber} className={`${input} w-full`} /></label>
          <label className="space-y-1 text-sm">Deceased income tax ref<input name="incomeTaxReference" defaultValue={administration.incomeTaxReference ?? estate.taxNumber} className={`${input} w-full`} /></label>
          <label className="space-y-1 text-sm">Deceased estate tax ref<input name="estateTaxReference" defaultValue={administration.estateTaxReference ?? estate.estateTaxNumber} className={`${input} w-full`} /></label>
          <label className="space-y-1 text-sm md:col-span-2">Residential address<input name="residentialAddress" defaultValue={wp.residentialAddress} className={`${input} w-full`} /></label>
          <label className="space-y-1 text-sm">Spouse (if in community)<input name="spouseName" defaultValue={wp.spouseName} className={`${input} w-full`} /></label>
          <details className="md:col-span-3">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">Advanced workpaper (vouchers, costs, I&amp;E, redistribution, estate duty)</summary>
            <textarea name="workpaperJson" rows={10} defaultValue={JSON.stringify(wp, null, 2)} className={`${input} mt-2 w-full font-mono text-xs`} aria-label="Workpaper JSON" />
          </details>
          <div className="md:col-span-3"><button className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800" type="submit">Save and recalculate</button></div>
        </form>
      </Card>

      <Card>
        <CardTitle>SARS deceased-estate tracker</CardTitle>
        <CardDescription className="mt-1">Follows the SARS process: report the estate case, coding and representative taxpayer, returns to date of death, estate tax number and post-death returns, REV267, estate duty payment, refunds and the DEC letter.</CardDescription>
        <div className="mt-3 divide-y divide-slate-100">
          {obligations.map((o) => (
            <form key={o.id} action={updateObligationAction} className="flex flex-wrap items-center gap-2 py-2">
              <input type="hidden" name="code" value={o.code} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">{o.title}{o.dueDate ? <span className="text-xs text-slate-500"> · due {o.dueDate}</span> : null}</p>
                <p className="text-xs text-slate-500">{o.notes}</p>
              </div>
              <StatusBadge value={o.status} />
              <select name="status" defaultValue={o.status} className="rounded-md border border-slate-300 px-2 py-1 text-xs" aria-label={`Status for ${o.title}`}>
                {["NOT_STARTED", "IN_PROGRESS", "SUBMITTED", "ASSESSED", "PAID", "COMPLETE", "NOT_APPLICABLE"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input name="reference" defaultValue={o.reference} placeholder="Reference" className="w-32 rounded-md border border-slate-300 px-2 py-1 text-xs" aria-label={`Reference for ${o.title}`} />
              <input name="amount" type="number" step="0.01" defaultValue={o.amount} placeholder="Amount" className="w-28 rounded-md border border-slate-300 px-2 py-1 text-xs" aria-label={`Amount for ${o.title}`} />
              <button type="submit" className="rounded-md border border-slate-200 px-2 py-1 text-xs">Save</button>
            </form>
          ))}
        </div>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Liquidation and Distribution Account (Reg 5, Schedule 4) — draft</h2>
        <LdAccountView result={result} />
      </div>
    </div>
  );
}
