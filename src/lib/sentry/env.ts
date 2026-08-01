export function envBool(value: string | undefined, defaultValue = false) {
  return value === undefined ? defaultValue : value === "true";
}

export function envNumber(value: string | undefined, defaultValue = 0): number {
  if (value === undefined) return defaultValue;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : defaultValue;
}

export function envSampleRate(value: string | undefined, defaultValue = 0) {
  const number = envNumber(value, defaultValue);

  return Math.min(1, Math.max(0, number));
}

export const sendDefaultPii = envBool(process.env.SENTRY_SEND_DEFAULT_PII);

export const sentryEnabled =
  envBool(process.env.NEXT_PUBLIC_SENTRY_ENABLED) &&
  !!(process.env.SENTRY_SERVER_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);
