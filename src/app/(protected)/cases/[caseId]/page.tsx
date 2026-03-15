import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCaseActivities, getCaseById } from "@/modules/cases/case-service";
import { getClientById } from "@/modules/clients/client-service";
import { listDocuments } from "@/modules/documents/document-service";
import { listKnowledgeBaseArticles } from "@/modules/knowledge-base/kb-service";

export default async function CaseDetailPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const taxCase = await getCaseById(caseId);

  if (!taxCase) {
    notFound();
  }

  const client = await getClientById(taxCase.clientId);
  const activities = await getCaseActivities(caseId);
  const documents = (await listDocuments()).filter((doc) => taxCase.linkedDocumentIds.includes(doc.id));
  const articles = (await listKnowledgeBaseArticles()).filter((article) =>
    taxCase.linkedKnowledgeArticleIds.includes(article.id),
  );

  const isIndividualClient = client?.clientType === "INDIVIDUAL";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{taxCase.title}</h1>
          <p className="text-sm text-slate-600">
            {taxCase.clientName} - {taxCase.taxType} - {taxCase.taxPeriodLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge value={taxCase.priority} />
          <StatusBadge value={taxCase.status} />
          <StatusBadge value={taxCase.reviewStatus} />
        </div>
      </div>

      <Card>
        <CardTitle>Workflow Actions</CardTitle>
        <CardDescription className="mt-1">
          Continue directly into linked SARS workflow modules.
        </CardDescription>
        <div className="mt-3 flex flex-wrap gap-2">
          {taxCase.taxType === "ITR12" ? (
            <Link
              href={`/itr12/${caseId}`}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
            >
              Open ITR12 Workspace
            </Link>
          ) : null}
          {isIndividualClient ? (
            <Link
              href={`/individual-tax/new?clientId=${taxCase.clientId}`}
              className="rounded-md bg-[#0E2433] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#12344a]"
            >
              New Individual Tax Assessment
            </Link>
          ) : null}
        </div>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardDescription>Case Type</CardDescription>
          <CardTitle className="mt-2">{taxCase.caseType}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Assigned User</CardDescription>
          <CardTitle className="mt-2">{taxCase.assignedUserName ?? "Unassigned"}</CardTitle>
        </Card>
        <Card>
          <CardDescription>Due Date</CardDescription>
          <CardTitle className="mt-2">{taxCase.dueDate}</CardTitle>
        </Card>
        <Card>
          <CardDescription>SARS Workflow State</CardDescription>
          <CardTitle className="mt-2">{taxCase.status.replaceAll("_", " ")}</CardTitle>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardTitle>Activity History</CardTitle>
          <CardDescription className="mt-1">Immutable timeline for internal auditability.</CardDescription>
          <ol className="mt-4 space-y-3">
            {activities.map((activity) => (
              <li key={activity.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{activity.action}</p>
                  <span className="text-xs text-slate-500">{new Date(activity.createdAt).toLocaleString("en-ZA")}</span>
                </div>
                <p className="mt-1 text-sm text-slate-700">{activity.summary}</p>
                <p className="mt-1 text-xs text-slate-500">by {activity.actorName}</p>
              </li>
            ))}
          </ol>
        </Card>

        <Card>
          <CardTitle>Linked Documents</CardTitle>
          <div className="mt-3 space-y-2">
            {documents.map((document) => (
              <div key={document.id} className="rounded-md border border-slate-200 p-2 text-sm">
                <p className="font-medium text-slate-800">{document.fileName}</p>
                <p className="text-xs text-slate-500">{document.category}</p>
              </div>
            ))}
            {!documents.length ? <p className="text-sm text-slate-500">No documents linked.</p> : null}
          </div>
          <CardTitle className="mt-5">Linked Legislation / References</CardTitle>
          <div className="mt-3 space-y-2">
            {articles.map((article) => (
              <div key={article.id} className="rounded-md border border-slate-200 p-2 text-sm">
                <p className="font-medium text-slate-800">{article.title}</p>
                <p className="text-xs text-slate-500">{article.sourceReference}</p>
              </div>
            ))}
            {!articles.length ? <p className="text-sm text-slate-500">No references linked.</p> : null}
          </div>
        </Card>
      </section>
    </div>
  );
}
