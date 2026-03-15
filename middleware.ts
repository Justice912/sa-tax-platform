import { withAuth } from "next-auth/middleware";
import type { NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { canAccessAdmin, hasPermission, ROUTE_PERMISSIONS } from "@/lib/rbac";
import type { ExtendedRole } from "@/lib/rbac";

/**
 * Resolves a pathname to its ROUTE_PERMISSIONS key, substituting the dynamic
 * [estateId] segment so it can be looked up in the static map.
 *
 * Examples:
 *   /estates/abc123/valuation  -> /estates/[estateId]/valuation
 *   /estates/abc123            -> /estates/[estateId]
 *   /estates                   -> /estates
 */
function resolveRoutePermissionKey(pathname: string): string | null {
  // Exact match first
  if (pathname in ROUTE_PERMISSIONS) {
    return pathname;
  }

  // Replace the estateId segment: /estates/<id>[/...] -> /estates/[estateId][/...]
  const estateSubRoutePattern = /^(\/estates\/)([^/]+)(\/.*)?$/;
  const match = estateSubRoutePattern.exec(pathname);
  if (match) {
    const suffix = match[3] ?? "";
    // For tax sub-routes like /estates/<id>/tax/cgt, map to /estates/[estateId]/tax
    const normalizedSuffix = suffix.startsWith("/tax") ? "/tax" : suffix;
    const key = `/estates/[estateId]${normalizedSuffix}`;
    if (key in ROUTE_PERMISSIONS) {
      return key;
    }
    // Fall back to the estate overview key for any unmatched sub-route
    return "/estates/[estateId]";
  }

  return null;
}

function middleware(request: NextRequestWithAuth) {
  const pathname = request.nextUrl.pathname;
  const role = request.nextauth.token?.role as ExtendedRole | undefined;

  // Admin-area guard (existing behaviour)
  if (pathname.startsWith("/admin") && !canAccessAdmin(role)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Estate route guard — enforce RBAC for executor and other restricted roles
  if (pathname.startsWith("/estates")) {
    const routeKey = resolveRoutePermissionKey(pathname);

    if (routeKey) {
      const requiredPermission = ROUTE_PERMISSIONS[routeKey];

      if (requiredPermission && !hasPermission(role, requiredPermission)) {
        // Executors are redirected to the estate overview when they attempt
        // to access a restricted sub-route (valuation, liquidation, tax).
        if (role === "EXECUTOR") {
          const estateSubRouteMatch = /^\/estates\/([^/]+)/.exec(pathname);
          if (estateSubRouteMatch) {
            const estateId = estateSubRouteMatch[1];
            return NextResponse.redirect(new URL(`/estates/${estateId}`, request.url));
          }
        }

        // All other roles without the required permission go back to dashboard
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  return NextResponse.next();
}

export default withAuth(middleware, {
  callbacks: {
    authorized: ({ token }) => Boolean(token),
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/clients/:path*",
    "/cases/:path*",
    "/itr12/:path*",
    "/individual-tax/:path*",
    "/reports/individual-tax/:path*",
    "/api/reports/individual-tax/:path*",
    "/knowledge-base/:path*",
    "/documents/:path*",
    "/admin/:path*",
    "/estates/:path*",
  ],
};
