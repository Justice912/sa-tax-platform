import { EstateUploadPortal } from "@/components/estates/estate-upload-portal";

export const dynamic = "force-dynamic";

export default async function EstateUploadPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <EstateUploadPortal token={token} />
      </div>
    </main>
  );
}
