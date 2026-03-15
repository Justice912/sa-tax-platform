import { withAuth } from "next-auth/middleware";
import type { NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { canAccessAdmin } from "@/lib/rbac";

function middleware(request: NextRequestWithAuth) {
  const pathname = request.nextUrl.pathname;
  const role = request.nextauth.token?.role as
    | "ADMIN"
    | "TAX_PRACTITIONER"
    | "REVIEWER"
    | "STAFF"
    | "CLIENT_PORTAL"
    | undefined;

  if (pathname.startsWith("/admin") && !canAccessAdmin(role)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
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
  ],
};
