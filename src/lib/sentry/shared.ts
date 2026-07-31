import { version } from "../../../package.json";
import { envBool, envNumber, envSampleRate, sendDefaultPii } from "./env";
import { beforeBreadcrumb, beforeSend } from "./sanitize";

export const sharedOptions = {
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  release: version,

  tracesSampleRate: envSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE),
  profilesSampleRate: envSampleRate(process.env.SENTRY_PROFILES_SAMPLE_RATE),

  sendDefaultPii,
  attachStacktrace: envBool(process.env.SENTRY_ATTACH_STACKTRACE),

  beforeSend,
  beforeBreadcrumb,

  enableLogs: envBool(process.env.SENTRY_ENABLE_LOGS),

  normalizeDepth: envNumber(process.env.SENTRY_NORMALIZE_DEPTH, 3),
  maxBreadcrumbs: envNumber(process.env.SENTRY_MAX_BREADCRUMBS, 100),

  ignoreErrors: process.env.SENTRY_IGNORE_ERRORS?.split(",")
    .map((v) => v.trim())
    .filter(Boolean),
} as const;
