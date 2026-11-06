import type { NodeOptions } from "@sentry/nextjs";
import * as Sentry from "@sentry/nextjs";
import { sharedOptions } from "./shared";

export const serverOptions = {
  ...sharedOptions,

  dsn: process.env.SENTRY_SERVER_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  tunnel:
    process.env.SENTRY_TUNNEL_ROUTE ||
    process.env.NEXT_PUBLIC_SENTRY_TUNNEL_ROUTE,

  integrations: [Sentry.pinoIntegration()],
} satisfies NodeOptions;
