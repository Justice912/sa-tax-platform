import { notFound } from "next/navigation";
import { ExecutorEstateDashboard } from "@/components/estates/executor-estate-dashboard";
import { getExecutorEstateByAccessToken } from "@/modules/estates/service";

export default async function ExecutorEstatePage({
  params,
}: {
  params: Promise<{ accessToken: string }>;
}) {
  const { accessToken } = await params;
  const estate = await getExecutorEstateByAccessToken(accessToken);

  if (!estate) {
    notFound();
  }

  return <ExecutorEstateDashboard estate={estate} />;
}
