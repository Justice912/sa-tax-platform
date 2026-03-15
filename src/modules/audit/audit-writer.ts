import { isDemoMode } from "@/lib/env";
import { prisma } from "@/lib/db";
import type { AuditLogRecord } from "@/modules/shared/types";
import { demoAuditLogs, demoUsers } from "@/server/demo-data";

export interface AuditInput {
  actorId?: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  beforeData?: unknown;
  afterData?: unknown;
}

export async function writeAuditLog(entry: AuditInput) {
  if (isDemoMode) {
    const actorName =
      demoUsers.find((user) => user.id === entry.actorId)?.fullName ?? "System";

    const demoEntry: AuditLogRecord = {
      id: `audit_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`,
      actorName,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      summary: entry.summary,
      createdAt: new Date().toISOString(),
    };

    demoAuditLogs.unshift(demoEntry);
    return;
  }

  await prisma.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      summary: entry.summary,
      beforeData: entry.beforeData as never,
      afterData: entry.afterData as never,
    },
  });
}

