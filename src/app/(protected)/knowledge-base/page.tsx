import { SAMPLE_CONTENT_DISCLAIMER } from "@/lib/disclaimers";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getKnowledgeCategories, listKnowledgeBaseArticles } from "@/modules/knowledge-base/kb-service";

export default async function KnowledgeBasePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; tag?: string }>;
}) {
  const params = await searchParams;
  const categories = getKnowledgeCategories();
  const articles = await listKnowledgeBaseArticles({
    category: params.category,
    tag: params.tag,
    query: params.q,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Tax Reference Knowledge Base</h1>
        <p className="text-sm text-slate-600">
          Central repository for legislation references, interpretation notes, and internal guidance.
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        {SAMPLE_CONTENT_DISCLAIMER}
      </div>

      <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr,220px,auto]">
        <input
          type="text"
          name="q"
          placeholder="Search title, summary, source..."
          defaultValue={params.q}
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

      <div className="grid gap-4 lg:grid-cols-2">
        {articles.map((article) => (
          <Card key={article.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{article.title}</h2>
              {article.isIllustrative ? <StatusBadge value="ILLUSTRATIVE" /> : null}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {article.category} • Effective {article.effectiveDate} • {article.jurisdiction}
            </p>
            <p className="mt-3 text-sm text-slate-700">{article.summary}</p>
            <p className="mt-3 text-xs text-slate-500">Source: {article.sourceReference}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  #{tag}
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

