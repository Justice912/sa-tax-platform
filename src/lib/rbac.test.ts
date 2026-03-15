import { describe, expect, it } from "vitest";
import { canAccessAdmin, canAccessEstate, hasPermission, ROUTE_PERMISSIONS } from "@/lib/rbac";

describe("rbac", () => {
  it("grants wildcard permissions to admins", () => {
    expect(hasPermission("ADMIN", "cases:write")).toBe(true);
  });

  it("blocks unknown permissions for staff users", () => {
    expect(hasPermission("STAFF", "admin:write")).toBe(false);
  });

  it("allows admin area for reviewer role", () => {
    expect(canAccessAdmin("REVIEWER")).toBe(true);
    expect(canAccessAdmin("STAFF")).toBe(false);
  });
});

describe("hasPermission — EXECUTOR role", () => {
  it("grants executor estate:view permission", () => {
    expect(hasPermission("EXECUTOR", "estate:view")).toBe(true);
  });

  it("grants executor estate:documents permission", () => {
    expect(hasPermission("EXECUTOR", "estate:documents")).toBe(true);
  });

  it("grants executor estate:timeline permission", () => {
    expect(hasPermission("EXECUTOR", "estate:timeline")).toBe(true);
  });

  it("grants executor estate:filing-pack permission", () => {
    expect(hasPermission("EXECUTOR", "estate:filing-pack")).toBe(true);
  });

  it("denies executor estate:manage permission (valuation, liquidation, tax)", () => {
    expect(hasPermission("EXECUTOR", "estate:manage")).toBe(false);
  });

  it("denies executor estate:list permission", () => {
    expect(hasPermission("EXECUTOR", "estate:list")).toBe(false);
  });

  it("denies executor cases:read permission", () => {
    expect(hasPermission("EXECUTOR", "cases:read")).toBe(false);
  });
});

describe("canAccessEstate", () => {
  const assignedEstate = {
    executorAccess: [
      { userId: "user_exec_001", email: "executor@example.co.za" },
    ],
  };

  const unassignedEstate = {
    executorAccess: [
      { userId: "user_exec_other", email: "other@example.co.za" },
    ],
  };

  const emptyAccessEstate = {
    executorAccess: [],
  };

  it("allows admin to access any estate", () => {
    expect(canAccessEstate("ADMIN", "user_admin", unassignedEstate)).toBe(true);
    expect(canAccessEstate("ADMIN", "user_admin", emptyAccessEstate)).toBe(true);
  });

  it("allows TAX_PRACTITIONER to access any estate", () => {
    expect(canAccessEstate("TAX_PRACTITIONER", "user_prac", unassignedEstate)).toBe(true);
  });

  it("allows REVIEWER to access any estate", () => {
    expect(canAccessEstate("REVIEWER", "user_reviewer", unassignedEstate)).toBe(true);
  });

  it("allows STAFF to access any estate", () => {
    expect(canAccessEstate("STAFF", "user_staff", unassignedEstate)).toBe(true);
  });

  it("allows executor to access estate they are assigned to by userId", () => {
    expect(
      canAccessEstate("EXECUTOR", "user_exec_001", assignedEstate, "executor@example.co.za"),
    ).toBe(true);
  });

  it("allows executor to access estate they are assigned to by email when userId does not match", () => {
    const estateWithEmailOnly = {
      executorAccess: [{ email: "executor@example.co.za" }],
    };
    expect(
      canAccessEstate("EXECUTOR", "user_exec_001", estateWithEmailOnly, "executor@example.co.za"),
    ).toBe(true);
  });

  it("denies executor access to estate they are not assigned to", () => {
    expect(
      canAccessEstate("EXECUTOR", "user_exec_001", unassignedEstate, "executor@example.co.za"),
    ).toBe(false);
  });

  it("denies executor access when estate has no executor access records", () => {
    expect(
      canAccessEstate("EXECUTOR", "user_exec_001", emptyAccessEstate, "executor@example.co.za"),
    ).toBe(false);
  });

  it("denies executor access when executorAccess is undefined", () => {
    expect(canAccessEstate("EXECUTOR", "user_exec_001", {}, "executor@example.co.za")).toBe(false);
  });

  it("denies unknown roles access to any estate", () => {
    expect(canAccessEstate("CLIENT_PORTAL", "user_client", assignedEstate)).toBe(false);
  });
});

describe("ROUTE_PERMISSIONS — executor-blocked routes require estate:manage", () => {
  it("valuation route requires estate:manage (not granted to executor)", () => {
    const required = ROUTE_PERMISSIONS["/estates/[estateId]/valuation"];
    expect(required).toBe("estate:manage");
    expect(hasPermission("EXECUTOR", required)).toBe(false);
  });

  it("liquidation route requires estate:manage (not granted to executor)", () => {
    const required = ROUTE_PERMISSIONS["/estates/[estateId]/liquidation"];
    expect(required).toBe("estate:manage");
    expect(hasPermission("EXECUTOR", required)).toBe(false);
  });

  it("tax route requires estate:manage (not granted to executor)", () => {
    const required = ROUTE_PERMISSIONS["/estates/[estateId]/tax"];
    expect(required).toBe("estate:manage");
    expect(hasPermission("EXECUTOR", required)).toBe(false);
  });

  it("filing-pack route requires estate:filing-pack (granted to executor)", () => {
    const required = ROUTE_PERMISSIONS["/estates/[estateId]/filing-pack"];
    expect(required).toBe("estate:filing-pack");
    expect(hasPermission("EXECUTOR", required)).toBe(true);
  });

  it("documents route requires estate:documents (granted to executor)", () => {
    const required = ROUTE_PERMISSIONS["/estates/[estateId]/documents"];
    expect(required).toBe("estate:documents");
    expect(hasPermission("EXECUTOR", required)).toBe(true);
  });

  it("timeline route requires estate:timeline (granted to executor)", () => {
    const required = ROUTE_PERMISSIONS["/estates/[estateId]/timeline"];
    expect(required).toBe("estate:timeline");
    expect(hasPermission("EXECUTOR", required)).toBe(true);
  });

  it("admin can access all route permissions including estate:manage", () => {
    expect(hasPermission("ADMIN", "estate:manage")).toBe(true);
    expect(hasPermission("ADMIN", "estate:list")).toBe(true);
  });
});
