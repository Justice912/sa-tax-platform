import { DataTable } from "@/components/ui/data-table";
import { listDocuments, getDocumentCategories } from "@/modules/documents/document-service";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const documents = await listDocuments({ query: params.q, category: params.category });
  const categories = getDocumentCategories();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Documents</h1>
        <p className="text-sm text-slate-600">
          Organize compliance evidence packs and link documents to clients and cases.
        </p>
      </div>

      <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr,220px,auto]">
        <input
          type="text"
          name="q"
          defaultValue={params.q}
          placeholder="Search file, client, tag..."
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select name="category" defaultValue={params.category ?? "all"} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="all">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <button className="rounded-md bg-[#0E2433] px-4 py-2 text-sm font-medium text-white">Apply</button>
      </form>

      <DataTable
        headers={["File", "Category", "Client", "Uploaded By", "Date", "Size", "Tags"]}
        rows={documents.map((document) => [
          document.fileName,
          document.category,
          document.clientName ?? "-",
          document.uploadedBy,
          document.uploadedAt,
          document.sizeLabel,
          <div key={`${document.id}-tags`} className="flex flex-wrap gap-1">
            {document.tags.map((tag) => (
              <span key={tag} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {tag}
              </span>
            ))}
          </div>,
        ])}
      />
    </div>
  );
}

