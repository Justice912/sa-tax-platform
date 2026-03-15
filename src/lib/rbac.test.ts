import { describe, expect, it } from "vitest";
import { canAccessAdmin, hasPermission } from "@/lib/rbac";

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

