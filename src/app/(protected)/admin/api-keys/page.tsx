import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth-options";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/api-auth";
import { isDemoMode } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function ApiKeysPage({ searchParams }: { searchParams?: Promise<{ key?: string }> }) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const query = (await searchParams) ?? {};
  if (isDemoMode || !userId) {
    return (
      <Card>
        <CardTitle>API keys</CardTitle>
        <CardDescription className="mt-2">
          API keys need the database (DEMO_MODE=false). In demo mode set TAXOPS_DEMO_API_KEY in the environment and use it as the bearer token.
        </CardDescription>
      </Card>
    );
  }
  const keys = await listApiKeys(userId);

  async function createAction(formData: FormData) {
    "use server";
    const s = await getServerSession(authOptions);
    if (!s?.user?.id) return;
    const days = Number(formData.get("expiresInDays") ?? 0);
    const { key } = await createApiKey(s.user.id, String(formData.get("name") ?? "Claude skill"), days > 0 ? days : undefined);
    redirect(`/admin/api-keys?key=${encodeURIComponent(key)}`);
  }

  async function revokeAction(formData: FormData) {
    "use server";
    const s = await getServerSession(authOptions);
    if (!s?.user?.id) return;
    await revokeApiKey(s.user.id, String(formData.get("id")));
    revalidatePath("/admin/api-keys");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">API keys</h1>
        <p className="text-sm text-slate-600">Personal keys for the REST API (/api/v1) used by the Claude deceased-estate skill. Keys act with your permissions.</p>
      </div>
      {query.key ? (
        <Card>
          <CardTitle>New key — copy it now</CardTitle>
          <CardDescription className="mt-1">It is stored only as a hash and will not be shown again.</CardDescription>
          <p className="mt-3 break-all rounded-md bg-slate-900 p-3 font-mono text-xs text-teal-200">{query.key}</p>
        </Card>
      ) : null}
      <Card>
        <CardTitle>Create key</CardTitle>
        <form action={createAction} className="mt-3 flex flex-wrap gap-2">
          <input name="name" required defaultValue="Claude deceased-estate skill" className="rounded-md border border-slate-300 px-3 py-2 text-sm" aria-label="Key name" />
          <input name="expiresInDays" type="number" min={0} defaultValue={90} className="w-28 rounded-md border border-slate-300 px-3 py-2 text-sm" aria-label="Expires in days (0 = never)" />
          <button className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white" type="submit">Create</button>
        </form>
      </Card>
      <Card>
        <CardTitle>Your keys</CardTitle>
        <ul className="mt-3 divide-y divide-slate-100 text-sm">
          {keys.map((k) => (
            <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                <strong>{k.name}</strong> · txo_{k.prefix}_… · created {k.createdAt.toISOString().slice(0, 10)}
                {k.lastUsedAt ? ` · last used ${k.lastUsedAt.toISOString().slice(0, 10)}` : ""}
                {k.expiresAt ? ` · expires ${k.expiresAt.toISOString().slice(0, 10)}` : ""}
                {k.revokedAt ? " · REVOKED" : ""}
              </span>
              {!k.revokedAt ? (
                <form action={revokeAction}>
                  <input type="hidden" name="id" value={k.id} />
                  <button className="rounded-md border border-slate-200 px-3 py-1 text-sm" type="submit">Revoke</button>
                </form>
              ) : null}
            </li>
          ))}
          {keys.length === 0 ? <li className="py-2 text-slate-500">No keys yet.</li> : null}
        </ul>
      </Card>
    </div>
  );
}
