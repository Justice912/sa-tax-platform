import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { listAuditLogsForEntities } from "@/modules/audit/audit-service";
import { listCases } from "@/modules/cases/case-service";
import { getClientById } from "@/modules/clients/client-service";
import { listDocuments } from "@/modules/documents/document-service";
import { listIndividualTaxAssessmentsByClient } from "@/modules/individual-tax/service";

export default async function ClientDetailPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = await getClientById(clientId);

  if (!client) {
    notFound();
  }

  const relatedCases = (await listCases()).filter((entry) => entry.clientId === clientId);
  const documents = (await listDocuments()).filter((entry) => entry.clientId === clientId);
  const assessments = await listIndividualTaxAssessmentsByClient(clientId);
  const auditLogs = await listAuditLogsForEntities(
    [
      { entityType: "Client", entityId: clientId },
      ...assessments.map((assessment) => ({
        entityType: "IndividualTaxAssessment",
        entityId: assessment.id,
      })),
    ],
    20,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{client.displayName}</h1>
          <p className="text-sm text-slate-600">
            {client.code} - {client.clientType}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge value={client.status} />
          <Link
            href={`/clients/${client.id}/edit`}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
          >
            Edit Client
          </Link>
        </div>
      </div>

      {client.clientType === "INDIVIDUAL" ? (
        <div>
          <Link
            href={`/individual-tax/new?clientId=${client.id}`}
            className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#12344a]"
          >
            New Individual Tax Assessment
          </Link>
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardTitle>Registration and References</CardTitle>
          <CardDescription className="mt-2 text-xs text-slate-500">
            Structured fields for tax references and legal identifiers.
          </CardDescription>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-slate-500">Tax reference</dt>
              <dd>{client.taxReferenceNumber ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Registration number</dt>
              <dd>{client.registrationNumber ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Assigned staff</dt>
              <dd>{client.assignedStaffName ?? "Unassigned"}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardTitle>Contact Details</CardTitle>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd>{client.email ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Phone</dt>
              <dd>{client.phone ?? "-"}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardTitle>Notes</CardTitle>
          <CardDescription className="mt-3 text-sm">{client.notes ?? "No notes captured."}</CardDescription>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardTitle>Linked Cases</CardTitle>
          <div className="mt-3 space-y-3">
            {relatedCases.map((taxCase) => (
              <Link
                key={taxCase.id}
                href={`/cases/${taxCase.id}`}
                className="block rounded-lg border border-slate-200 p-3 transition hover:border-teal-300"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{taxCase.title}</p>
                  <StatusBadge value={taxCase.status} />
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {taxCase.taxType} - Due {taxCase.dueDate}
                </p>
              </Link>
            ))}
            {!relatedCases.length ? <p className="text-sm text-slate-500">No cases linked yet.</p> : null}
          </div>
        </Card>

        <Card>
          <CardTitle>Linked Documents</CardTitle>
          <div className="mt-3 space-y-2">
            {documents.map((document) => (
              <div key={document.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-900">{document.fileName}</p>
                <p className="text-xs text-slate-600">
                  {document.category} - {document.uploadedAt}
                </p>
              </div>
            ))}
            {!documents.length ? <p className="text-sm text-slate-500">No documents linked.</p> : null}
          </div>
        </Card>

        <Card>
          <CardTitle>Individual Tax Assessments</CardTitle>
          <div className="mt-3 space-y-2">
            {assessments.map((assessment) => (
              <Link
                key={assessment.id}
                href={`/individual-tax/${assessment.id}`}
                className="block rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm transition hover:border-teal-300"
              >
                <p className="font-medium text-slate-900">
                  Ref {assessment.referenceNumber}
                </p>
                <p className="text-xs text-slate-600">
                  Date {assessment.assessmentDate} - Year {assessment.assessmentYear}
                </p>
              </Link>
            ))}
            {!assessments.length ? (
              <p className="text-sm text-slate-500">No individual tax assessments saved yet.</p>
            ) : null}
          </div>
        </Card>
      </section>

      <Card>
        <CardTitle>Client Change Log</CardTitle>
        <CardDescription className="mt-1">
          Unified timeline of client profile and linked individual tax assessment changes.
        </CardDescription>
        <div className="mt-3 space-y-2">
          {auditLogs.map((entry) => (
            <div key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  {entry.action}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(entry.createdAt).toLocaleString("en-ZA")}
                </p>
              </div>
              <p className="mt-1 text-sm text-slate-700">{entry.summary}</p>
              <p className="mt-1 text-xs text-slate-500">
                {entry.entityType} - {entry.actorName}
              </p>
            </div>
          ))}
          {!auditLogs.length ? (
            <p className="text-sm text-slate-500">No change log entries available.</p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
