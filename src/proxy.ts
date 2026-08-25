import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { hasPermissionsJWTSync } from "./lib/permissions";
import { routeGuardFor } from "./lib/route-guard";
import { routes } from "./routes";

/**
 * Route-level authentication and authorization.
 *
 * In Next 16 this file is `proxy.ts`; the `middleware.ts` convention it replaces
 * is deprecated.
 *
 * This runs *in front of* the per-page checks, it does not replace them. Pages
 * still call `hasPermission` themselves, which is what enforces the finer,
 * per-feature permissions and what protects any route not listed in
 * `route-guard.ts`. The value here is that an unauthenticated or unauthorized
 * request is turned away before any page code, database query or GBX call runs.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const login = new URL(routes.login, request.url);
    // So the user lands back where they were aiming after signing in.
    login.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  const guard = routeGuardFor(pathname);

  if (guard && !hasPermissionsJWTSync(token, guard.permissions, guard.id)) {
    return NextResponse.redirect(new URL(routes.dashboard, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Page routes only. Everything excluded here authenticates itself:
     *
     * - `api/auth`   NextAuth's own endpoints, which must stay reachable while
     *                signed out or sign-in cannot complete.
     * - `api/ws`     WebSocket upgrades. They already parse and check the token
     *                per connection, and a redirect response would break the
     *                upgrade handshake rather than deny it cleanly.
     * - `api`        Server actions and route handlers, all of which go through
     *                doServerActionWithAuth or an explicit token check.
     * - `_next`,
     *   static files, and the login page itself.
     */
    "/((?!api|_next/static|_next/image|login|favicon.ico|icon.ico|apple-icon.png|opengraph-image.png|twitter-image.png).*)",
  ],
};
