import { prisma } from "@/lib/db";
import { isDemoMode } from "@/lib/env";
import type { AuditLogRecord } from "@/modules/shared/types";
import { demoAuditLogs } from "@/server/demo-data";

export interface AuditEntityFilter {
  entityType: string;
  entityId: string;
}

export async function listAuditLogs(limit = 10) {
  if (!isDemoMode) {
    const rows = await prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { actor: true },
    });

    return rows.map<AuditLogRecord>((entry) => ({
      id: entry.id,
      actorName: entry.actor?.fullName ?? "System",
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      summary: entry.summary,
      createdAt: entry.createdAt.toISOString(),
    }));
  }

  return demoAuditLogs.slice(0, limit);
}

export async function listAuditLogsForEntities(
  filters: AuditEntityFilter[],
  limit = 20,
) {
  if (!filters.length) {
    return [] satisfies AuditLogRecord[];
  }

  if (!isDemoMode) {
    const rows = await prisma.auditLog.findMany({
      where: {
        OR: filters.map((entry) => ({
          entityType: entry.entityType,
          entityId: entry.entityId,
        })),
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { actor: true },
    });

    return rows.map<AuditLogRecord>((entry) => ({
      id: entry.id,
      actorName: entry.actor?.fullName ?? "System",
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      summary: entry.summary,
      createdAt: entry.createdAt.toISOString(),
    }));
  }

  const filtered = demoAuditLogs
    .filter((entry) =>
      filters.some(
        (filter) =>
          filter.entityType === entry.entityType && filter.entityId === entry.entityId,
      ),
    )
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return filtered.slice(0, limit);
}

