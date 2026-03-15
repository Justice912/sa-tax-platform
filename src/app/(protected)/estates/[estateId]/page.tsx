import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { canAccessEstate } from "@/lib/rbac";
import { EstateDashboard } from "@/components/estates/estate-dashboard";
import { ExecutorEstateDashboard } from "@/components/estates/executor-estate-dashboard";
import { calculateEstateLiquidationSummary } from "@/modules/estates/liquidation";
import { validateEstateStageAdvance } from "@/modules/estates/stage-validation";
import {
  advanceEstateStage,
  buildExecutorEstateViewFromDetail,
  createEstateExecutorAccess,
  getEstateById,
  revokeEstateExecutorAccess,
} from "@/modules/estates/service";

export default async function EstateDetailPage({
  params,
}: {
  params: Promise<{ estateId: string }>;
}) {
  const { estateId } = await params;
  const [estate, session] = await Promise.all([
    getEstateById(estateId),
    getServerSession(authOptions),
  ]);

  if (!estate) {
    notFound();
  }

  const userRole = session?.user?.role ?? "";
  const userId = session?.user?.id ?? "";
  const userEmail = session?.user?.email ?? undefined;

  // Verify the user has permission to access this estate at all.
  // executorAccess in EstateDetailRecord stores recipientEmail, not userId.
  const accessibleEstate = {
    executorAccess: estate.executorAccess.map((entry) => ({
      email: entry.recipientEmail,
    })),
  };

  if (!canAccessEstate(userRole, userId, accessibleEstate, userEmail)) {
    notFound();
  }

  // EXECUTOR role: render the read-only executor dashboard instead of the
  // full practitioner dashboard. Build the executor view from the full detail.
  if (userRole === "EXECUTOR") {
    const executorAccessRecord = estate.executorAccess.find(
      (entry) =>
        entry.recipientEmail === userEmail && entry.status === "ACTIVE",
    );

    const executorView = buildExecutorEstateViewFromDetail(estate, {
      recipientName: executorAccessRecord?.recipientName ?? userEmail ?? "Executor",
      recipientEmail: executorAccessRecord?.recipientEmail ?? userEmail ?? "",
      expiresAt: executorAccessRecord?.expiresAt ?? "",
      status: executorAccessRecord?.status ?? "ACTIVE",
      lastAccessedAt: executorAccessRecord?.lastAccessedAt,
    });

    return <ExecutorEstateDashboard estate={executorView} estateId={estateId} />;
  }

  // Practitioner / admin / staff / reviewer: full dashboard
  const liquidationSummary = calculateEstateLiquidationSummary(estate);
  const workflowValidation = validateEstateStageAdvance(estate);

  async function advanceStageAction() {
    "use server";

    const serverSession = await getServerSession(authOptions);
    const actorName = serverSession?.user?.name ?? "Estate workflow";

    await advanceEstateStage(estateId, actorName);
    revalidatePath("/estates");
    revalidatePath(`/estates/${estateId}`);
    revalidatePath(`/estates/${estateId}/timeline`);
  }

  async function issueExecutorAccessAction(formData: FormData) {
    "use server";

    await createEstateExecutorAccess(estateId, {
      recipientName: String(formData.get("recipientName") ?? ""),
      recipientEmail: String(formData.get("recipientEmail") ?? ""),
      expiresAt: String(formData.get("expiresAt") ?? ""),
    });

    revalidatePath(`/estates/${estateId}`);
  }

  async function revokeExecutorAccessAction(formData: FormData) {
    "use server";

    await revokeEstateExecutorAccess(String(formData.get("accessId") ?? ""));
    revalidatePath(`/estates/${estateId}`);
  }

  return (
    <EstateDashboard
      estate={estate}
      liquidationSummary={liquidationSummary}
      workflowValidation={workflowValidation}
      advanceStageAction={advanceStageAction}
      issueExecutorAccessAction={issueExecutorAccessAction}
      revokeExecutorAccessAction={revokeExecutorAccessAction}
    />
  );
}
