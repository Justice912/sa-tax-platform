import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { DocumentRequestRecord, EstateDocumentRecord, UploadLinkRecord } from "@/modules/estates/workflow/types";

type Action = (formData: FormData) => void | Promise<void>;

const btn = "rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700";
const primary = "rounded-md bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-800";

const AUDIENCE_LABEL: Record<string, string> = { MASTER: "Master", SARS: "SARS", LD_VOUCHER: "L&D voucher", INTERNAL: "Internal" };

export function EstateDocumentWorkflow({
  estateId,
  requests,
  documents,
  links,
  newLinkUrl,
  initialiseAction,
  createLinkAction,
  revokeLinkAction,
  uploadAction,
  reviewAction,
  requestStatusAction,
}: {
  estateId: string;
  requests: DocumentRequestRecord[];
  documents: EstateDocumentRecord[];
  links: UploadLinkRecord[];
  newLinkUrl?: string;
  initialiseAction: Action;
  createLinkAction: Action;
  revokeLinkAction: Action;
  uploadAction: Action;
  reviewAction: Action;
  requestStatusAction: Action;
}) {
  const outstanding = requests.filter((r) => r.status === "REQUESTED" || r.status === "REJECTED");
  const groups = ["MASTER", "SARS", "LD_VOUCHER", "INTERNAL"].map((a) => ({ audience: a, items: requests.filter((r) => r.audience === a) })).filter((g) => g.items.length);

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Document requests</CardTitle>
            <CardDescription className="mt-1">
              {requests.length} requested · {outstanding.length} outstanding · {requests.filter((r) => r.status === "ACCEPTED").length} accepted.
              Requests follow the Master&apos;s reporting list, the SARS estate-case list and the L&amp;D vouchers.
            </CardDescription>
          </div>
          <form action={initialiseAction}>
            <button className={btn} type="submit">{requests.length ? "Refresh standard requests" : "Generate standard requests"}</button>
          </form>
        </div>

        {groups.map((g) => (
          <section key={g.audience} className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{AUDIENCE_LABEL[g.audience]}</h3>
            <div className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {g.items.map((r) => {
                const docs = documents.filter((d) => d.requestId === r.id);
                return (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">{r.title}</p>
                      <p className="text-xs text-slate-500">{docs.length} file(s){r.requestedFrom ? ` · from ${r.requestedFrom.toLowerCase()}` : ""}{r.dueDate ? ` · due ${r.dueDate}` : ""}</p>
                    </div>
                    <StatusBadge value={r.status} />
                    <form action={requestStatusAction} className="flex items-center gap-1">
                      <input type="hidden" name="requestId" value={r.id} />
                      <select name="status" defaultValue={r.status} aria-label={`Status for ${r.title}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs">
                        {["REQUESTED", "UPLOADED", "ACCEPTED", "REJECTED", "WAIVED"].map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button type="submit" className={btn} aria-label={`Save status for ${r.title}`}>Save</button>
                    </form>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </Card>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle>Send a secure upload link</CardTitle>
          <CardDescription className="mt-1">The executor or an heir uploads without logging in. Links expire and only cover the outstanding requests.</CardDescription>
          {newLinkUrl ? (
            <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm">
              <p className="font-medium text-teal-900">Link created — copy it now, it is not shown again:</p>
              <p className="mt-1 break-all font-mono text-xs text-teal-900">{newLinkUrl}</p>
            </div>
          ) : null}
          <form action={createLinkAction} className="mt-3 grid gap-2 sm:grid-cols-2">
            <input name="recipientName" required placeholder="Recipient name" className="rounded-md border border-slate-300 px-3 py-2 text-sm" aria-label="Recipient name" />
            <input name="recipientEmail" type="email" placeholder="Email (optional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" aria-label="Recipient email" />
            <input name="expiresInDays" type="number" min={1} max={60} defaultValue={14} className="rounded-md border border-slate-300 px-3 py-2 text-sm" aria-label="Days valid" />
            <button className={primary} type="submit" disabled={outstanding.length === 0}>Create link ({outstanding.length} requests)</button>
          </form>
          <ul className="mt-3 space-y-1 text-sm">
            {links.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-700">{l.recipientName} · {l.requestIds.length} requests · expires {l.expiresAt.slice(0, 10)}{l.lastUsedAt ? ` · last used ${l.lastUsedAt.slice(0, 10)}` : ""}</span>
                {l.status === "ACTIVE" ? (
                  <form action={revokeLinkAction}>
                    <input type="hidden" name="linkId" value={l.id} />
                    <button className={btn} type="submit">Revoke</button>
                  </form>
                ) : (
                  <StatusBadge value={l.status} />
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardTitle>Upload as practice</CardTitle>
          <CardDescription className="mt-1">PDF, images, Word or Excel up to 4 MB here (use the API or an upload link for larger scans).</CardDescription>
          <form action={uploadAction} className="mt-3 space-y-2">
            <select name="requestId" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" aria-label="Document request">
              <option value="">General supporting document</option>
              {requests.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>
            <input name="file" type="file" required className="w-full text-sm" aria-label="File" />
            <button className={primary} type="submit">Upload</button>
          </form>
        </Card>
      </section>

      <Card>
        <CardTitle>Uploaded documents</CardTitle>
        <div className="mt-3 divide-y divide-slate-100">
          {documents.length === 0 ? <p className="text-sm text-slate-500">No documents uploaded yet.</p> : null}
          {documents.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
              <div className="min-w-0 flex-1">
                <a className="text-sm font-medium text-teal-800 hover:underline" href={`/api/v1/estates/${estateId}/documents/${d.id}/download`}>{d.fileName}</a>
                <p className="text-xs text-slate-500">
                  {requests.find((r) => r.id === d.requestId)?.title ?? "General"} · {d.uploaderName} · {d.uploadedAt.slice(0, 10)} · SARS name {d.sarsFileName}
                  {d.reviewNote ? ` · note: ${d.reviewNote}` : ""}
                </p>
              </div>
              <StatusBadge value={d.status} />
              <form action={reviewAction} className="flex items-center gap-1">
                <input type="hidden" name="documentId" value={d.id} />
                <input name="reviewNote" placeholder="Note" className="w-28 rounded-md border border-slate-300 px-2 py-1 text-xs" aria-label={`Review note for ${d.fileName}`} />
                <button name="status" value="ACCEPTED" className={btn} type="submit">Accept</button>
                <button name="status" value="REJECTED" className={btn} type="submit">Reject</button>
              </form>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
