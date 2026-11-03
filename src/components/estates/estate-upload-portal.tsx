"use client";

import { useCallback, useEffect, useState } from "react";

interface PortalRequest {
  id: string;
  title: string;
  description?: string;
  status: string;
  uploadedCount: number;
}

interface PortalData {
  recipientName: string;
  expiresAt: string;
  estate: { reference?: string; deceasedName?: string };
  requests: PortalRequest[];
}

const DIRECT_LIMIT = 4 * 1024 * 1024;

export function EstateUploadPortal({ token }: { token: string }) {
  const [data, setData] = useState<PortalData>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState<string>();
  const [messages, setMessages] = useState<Record<string, string>>({});
  const base = `/api/upload-links/${encodeURIComponent(token)}`;

  const load = useCallback(async () => {
    const res = await fetch(base, { cache: "no-store" });
    const payload = await res.json();
    if (!res.ok) setError(payload.error ?? "This link is not available.");
    else setData(payload);
  }, [base]);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(requestId: string, file: File) {
    setBusy(requestId);
    setMessages((m) => ({ ...m, [requestId]: `Uploading ${file.name}…` }));
    const meta = { fileName: file.name, mimeType: file.type || "application/pdf", fileSizeBytes: file.size, requestId };
    try {
      const signRes = await fetch(`${base}/sign`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(meta) });
      const ticket = await signRes.json();
      if (!signRes.ok) throw new Error(ticket.error ?? "Upload refused.");
      let done = false;
      if (ticket.mode === "supabase") {
        const put = await fetch(ticket.signedUrl, { method: "PUT", headers: { "content-type": meta.mimeType, "x-upsert": "false" }, body: file });
        if (put.ok) {
          const complete = await fetch(`${base}/complete`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...meta, storageKey: ticket.storageKey }) });
          const result = await complete.json();
          if (!complete.ok) throw new Error(result.error ?? "Could not register the upload.");
          done = true;
        } else if (file.size > DIRECT_LIMIT) {
          throw new Error("Upload to secure storage failed. Please try again.");
        }
      }
      if (!done) {
        const form = new FormData();
        form.set("file", file);
        form.set("requestId", requestId);
        const res = await fetch(`${base}/direct`, { method: "POST", body: form });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error ?? "Upload failed.");
      }
      setMessages((m) => ({ ...m, [requestId]: `Received ${file.name}. Thank you — the practice will review it.` }));
      await load();
    } catch (e) {
      setMessages((m) => ({ ...m, [requestId]: e instanceof Error ? e.message : "Upload failed." }));
    } finally {
      setBusy(undefined);
    }
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-slate-900">Upload link unavailable</h1>
        <p className="mt-2 text-sm text-slate-600">{error} Please contact the practice for a new link.</p>
      </div>
    );
  }
  if (!data) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="space-y-5">
      <header className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Secure document upload</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Estate late {data.estate.deceasedName}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Hello {data.recipientName}. Please upload the documents below for the administration of this estate
          ({data.estate.reference}). PDF or clear photos are accepted, up to 25 MB each. This link expires on{" "}
          {new Date(data.expiresAt).toLocaleDateString("en-ZA")}.
        </p>
      </header>
      <ul className="space-y-3">
        {data.requests.map((r) => (
          <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">{r.title}</p>
                {r.description ? <p className="mt-1 text-sm text-slate-500">{r.description}</p> : null}
                <p className="mt-1 text-xs text-slate-500">
                  {r.status === "ACCEPTED" ? "Accepted by the practice" : r.status === "REJECTED" ? "Please upload again — the previous file was not accepted" : r.uploadedCount > 0 ? `${r.uploadedCount} file(s) received` : "Outstanding"}
                </p>
              </div>
              <label className={`cursor-pointer rounded-md px-3 py-2 text-sm font-medium ${busy ? "bg-slate-200 text-slate-500" : "bg-teal-700 text-white hover:bg-teal-800"}`}>
                {busy === r.id ? "Uploading…" : "Choose file"}
                <input
                  type="file"
                  className="sr-only"
                  disabled={Boolean(busy)}
                  accept=".pdf,.jpg,.jpeg,.png,.heic,.webp,.doc,.docx,.xls,.xlsx"
                  aria-label={`Upload ${r.title}`}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void upload(r.id, file);
                  }}
                />
              </label>
            </div>
            {messages[r.id] ? <p className="mt-2 text-sm text-slate-700" role="status">{messages[r.id]}</p> : null}
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-500">
        Your documents are stored privately and used only for the administration of this estate (POPIA).
      </p>
    </div>
  );
}
