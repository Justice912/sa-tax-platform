import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { EstateDashboard } from "@/components/estates/estate-dashboard";
import { calculateEstateLiquidationSummary } from "@/modules/estates/liquidation";
import { validateEstateStageAdvance } from "@/modules/estates/stage-validation";
import {
  advanceEstateStage,
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
  const estate = await getEstateById(estateId);

  if (!estate) {
    notFound();
  }

  const liquidationSummary = calculateEstateLiquidationSummary(estate);
  const workflowValidation = validateEstateStageAdvance(estate);

  async function advanceStageAction() {
    "use server";

    const session = await getServerSession(authOptions);
    const actorName = session?.user?.name ?? "Estate workflow";

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
