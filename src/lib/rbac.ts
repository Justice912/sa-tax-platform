import type { RoleCode } from "@prisma/client";

export type AppRole = RoleCode;

export const rolePermissions: Record<AppRole, string[]> = {
  ADMIN: ["*"],
  TAX_PRACTITIONER: [
    "clients:read",
    "clients:write",
    "cases:read",
    "cases:write",
    "documents:read",
    "documents:write",
    "knowledge:read",
    "knowledge:write",
    "dashboard:read",
  ],
  REVIEWER: [
    "clients:read",
    "cases:read",
    "cases:review",
    "documents:read",
    "knowledge:read",
    "knowledge:write",
    "dashboard:read",
    "admin:read",
  ],
  STAFF: [
    "clients:read",
    "clients:write",
    "cases:read",
    "documents:read",
    "documents:write",
    "knowledge:read",
    "dashboard:read",
  ],
  CLIENT_PORTAL: ["dashboard:read", "documents:read", "cases:read"],
};

export function hasPermission(role: AppRole | undefined, permission: string): boolean {
  if (!role) {
    return false;
  }

  const permissions = rolePermissions[role] ?? [];
  if (permissions.includes("*")) {
    return true;
  }

  return permissions.includes(permission);
}

export function canAccessAdmin(role: AppRole | undefined): boolean {
  return role === "ADMIN" || role === "REVIEWER";
}

