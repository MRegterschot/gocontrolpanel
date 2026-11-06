import type { BrowserOptions, EdgeOptions, NodeOptions } from "@sentry/nextjs";
import * as Sentry from "@sentry/nextjs";
import { sentryEnabled } from "./env";

export function initializeSentry(
  options: BrowserOptions | EdgeOptions | NodeOptions,
) {
  if (!sentryEnabled) return;

  Sentry.init(options);
}
