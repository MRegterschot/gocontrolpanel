import { routes } from "@/routes";

// Where to send the user after signing in. Only paths on this site, so the landing page
// can't be used to send someone elsewhere.
export function safeCallbackUrl(value: string | string[] | undefined): string {
  const url = Array.isArray(value) ? value[0] : value;
  if (
    !url ||
    !url.startsWith("/") ||
    url.startsWith("//") ||
    url.startsWith("/\\")
  ) {
    return routes.dashboard;
  }
  // Coming back to the landing page after signing in would loop
  return url === routes.login || url.startsWith(`${routes.login}?`)
    ? routes.dashboard
    : url;
}
