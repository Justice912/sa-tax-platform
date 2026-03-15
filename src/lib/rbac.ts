import type { RoleCode } from "@prisma/client";

export type AppRole = RoleCode;

// EXECUTOR is not a Prisma RoleCode (no DB login); it is a session-only role
// issued when an executor logs in via the executor access portal.
export type ExtendedRole = AppRole | "EXECUTOR";

export const rolePermissions: Record<ExtendedRole, string[]> = {
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
    // Estate practitioner permissions
    "estate:list",
    "estate:view",
    "estate:manage",
    "estate:documents",
    "estate:timeline",
    "estate:filing-pack",
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
    // Estates read-only for reviewers
    "estate:list",
    "estate:view",
    "estate:documents",
    "estate:timeline",
    "estate:filing-pack",
  ],
  STAFF: [
    "clients:read",
    "clients:write",
    "cases:read",
    "documents:read",
    "documents:write",
    "knowledge:read",
    "dashboard:read",
    // Estate staff permissions
    "estate:list",
    "estate:view",
    "estate:manage",
    "estate:documents",
    "estate:timeline",
    "estate:filing-pack",
  ],
  CLIENT_PORTAL: ["dashboard:read", "documents:read", "cases:read"],
  EXECUTOR: [
    // Executors get read-only access to their assigned estate only
    "estate:view",
    "estate:documents",
    "estate:timeline",
    "estate:filing-pack",
  ],
};

/**
 * Scope restriction metadata: executors can only access estates they are
 * explicitly assigned to. Admin and practitioner roles have unrestricted access.
 */
export const roleScopeRestriction: Partial<Record<ExtendedRole, string>> = {
  EXECUTOR: "ASSIGNED_ESTATES_ONLY",
};

export function hasPermission(role: ExtendedRole | undefined, permission: string): boolean {
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

/**
 * Checks whether a user can access a specific estate, enforcing scope
 * restrictions for the EXECUTOR role.
 *
 * Admins and practitioners can access all estates.
 * Executors can only access estates where their userId or email appears in
 * the executorAccess list.
 */
export function canAccessEstate(
  userRole: string,
  userId: string,
  estate: { executorAccess?: Array<{ userId?: string; email?: string }> },
  userEmail?: string,
): boolean {
  // Admins and practitioners can access all estates
  if (userRole === "ADMIN" || userRole === "TAX_PRACTITIONER") return true;

  // Reviewers and staff can view all estates (read-only for reviewer, managed for staff)
  if (userRole === "REVIEWER" || userRole === "STAFF") return true;

  // Executors can only access estates where they have executor access
  if (userRole === "EXECUTOR") {
    const access = estate.executorAccess ?? [];
    return access.some(
      (entry) => entry.userId === userId || entry.email === userEmail,
    );
  }

  return false;
}

/**
 * Route-level permission mapping used by middleware to enforce RBAC on estate
 * sub-routes. Routes that require "estate:manage" are blocked for executors.
 */
export const ROUTE_PERMISSIONS: Record<string, string> = {
  "/estates": "estate:list",
  "/estates/[estateId]": "estate:view",
  "/estates/[estateId]/assets": "estate:view",
  "/estates/[estateId]/liabilities": "estate:view",
  "/estates/[estateId]/beneficiaries": "estate:view",
  "/estates/[estateId]/deceased-info": "estate:view",
  "/estates/[estateId]/documents": "estate:documents",
  "/estates/[estateId]/timeline": "estate:timeline",
  "/estates/[estateId]/filing-pack": "estate:filing-pack",
  "/estates/[estateId]/valuation": "estate:manage",    // Executors cannot run valuations
  "/estates/[estateId]/liquidation": "estate:manage",  // Executors cannot manage liquidation
  "/estates/[estateId]/tax": "estate:manage",          // Executors cannot access tax workspaces
  "/individual-tax": "itax:list",
  "/itr12": "itr12:list",
  "/cases": "case:list",
};
