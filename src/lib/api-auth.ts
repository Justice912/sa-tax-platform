import crypto from "node:crypto";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { isDemoMode } from "@/lib/env";
import { authOptions } from "@/lib/auth-options";
import { hasPermission, type ExtendedRole } from "@/lib/rbac";

/**
 * API key authentication for /api/v1 (pattern used by Cal.com / Unkey-style keys):
 * keys look like `txo_<prefix>_<secret>`, only a SHA-256 hash is stored, the
 * plain key is shown once at creation. Session cookies are also accepted so the
 * app's own UI can call the same endpoints.
 */

export interface ApiPrincipal {
  userId?: string;
  name: string;
  via: "api-key" | "session" | "demo-key";
  role?: ExtendedRole;
}

export const API_KEY_PREFIX = "txo";

export function hashApiKey(key: string) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function generateApiKey() {
  const prefix = crypto.randomBytes(4).toString("hex");
  const secret = crypto.randomBytes(24).toString("base64url");
  return { key: `${API_KEY_PREFIX}_${prefix}_${secret}`, prefix };
}

export async function createApiKey(userId: string, name: string, expiresInDays?: number) {
  const { key, prefix } = generateApiKey();
  const row = await prisma.apiKey.create({
    data: {
      userId,
      name,
      prefix,
      keyHash: hashApiKey(key),
      scopes: ["estates:read", "estates:write"],
      expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86_400_000) : null,
    },
  });
  return { id: row.id, key, prefix };
}

export async function listApiKeys(userId: string) {
  return prisma.apiKey.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, prefix: true, lastUsedAt: true, expiresAt: true, revokedAt: true, createdAt: true } });
}

export async function revokeApiKey(userId: string, id: string) {
  await prisma.apiKey.updateMany({ where: { id, userId }, data: { revokedAt: new Date() } });
}

function timingSafeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export async function authenticateApiRequest(request: Request): Promise<ApiPrincipal | undefined> {
  const header = request.headers.get("authorization") ?? "";
  const key = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : request.headers.get("x-api-key")?.trim();

  if (key) {
    if (isDemoMode) {
      const demoKey = process.env.TAXOPS_DEMO_API_KEY;
      return demoKey && timingSafeEqual(key, demoKey) ? { name: "Demo API key", via: "demo-key", role: "ADMIN" } : undefined;
    }
    if (!key.startsWith(`${API_KEY_PREFIX}_`)) return undefined;
    const row = await prisma.apiKey.findUnique({ where: { keyHash: hashApiKey(key) }, include: { user: { include: { roles: { include: { role: true } } } } } });
    if (!row || row.revokedAt || (row.expiresAt && row.expiresAt < new Date()) || !row.user.isActive) return undefined;
    await prisma.apiKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } });
    const role = row.user.roles[0]?.role.code as ExtendedRole | undefined;
    if (!hasPermission(role, "estate:manage")) return undefined;
    return { userId: row.userId, name: row.user.fullName, via: "api-key", role };
  }

  const session = await getServerSession(authOptions);
  const role = session?.user?.role as ExtendedRole | undefined;
  if (session?.user && hasPermission(role, "estate:manage")) {
    return { userId: session.user.id, name: session.user.name ?? session.user.email ?? "User", via: "session", role };
  }
  return undefined;
}
