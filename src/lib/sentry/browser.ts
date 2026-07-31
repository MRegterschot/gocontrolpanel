import type { BrowserOptions } from "@sentry/nextjs";
import { envSampleRate } from "./env";
import { sharedOptions } from "./shared";

export const browserOptions = {
  ...sharedOptions,

  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tunnel: process.env.NEXT_PUBLIC_SENTRY_TUNNEL_ROUTE,

  replaysSessionSampleRate: envSampleRate(
    process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
  ),

  replaysOnErrorSampleRate: envSampleRate(
    process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
  ),
} satisfies BrowserOptions;
