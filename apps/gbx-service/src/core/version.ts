declare const __TMCP_VERSION__: string | undefined;

// Baked in at build time from the root package.json; "dev" when running from source
export const SERVICE_VERSION =
  typeof __TMCP_VERSION__ === "string" ? __TMCP_VERSION__ : "dev";

// What the connect notice says about this controller, e.g. "v0.12.0-beta 48d73d5"
export function controllerLabel(revision?: string): string {
  return [`v${SERVICE_VERSION}`, revision?.slice(0, 7)]
    .filter(Boolean)
    .join(" ");
}
