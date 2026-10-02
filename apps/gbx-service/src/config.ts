import { fileURLToPath } from "node:url";
import { z } from "zod";
import { DEFAULT_ECM_URL } from "./infra/ecm/ecm-client";

const csv = z
  .string()
  .default("")
  .transform((value) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3100),
  LOG_LEVEL: z.string().default("info"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URI: z.string().min(1, "REDIS_URI is required"),
  GBX_SERVICE_TOKEN: z.string().min(32, "GBX_SERVICE_TOKEN must be at least 32 characters"),
  WS_TICKET_SECRET: z.string().min(32, "WS_TICKET_SECRET must be at least 32 characters"),
  WS_ALLOWED_ORIGINS: csv,
  // Limit which servers this instance manages; empty manages all (see X-2 in the requirements)
  GBX_SERVICE_ENABLED_SERVERS: csv,
  NADEO_SERVER_LOGIN: z.string().default(""),
  NADEO_SERVER_PASSWORD: z.string().default(""),
  NADEO_CONTACT: z.string().default("GoControlPanel"),
  NADEO_CLIENT_ID: z.string().default(""),
  NADEO_CLIENT_SECRET: z.string().default(""),
  ECM_URL: z.string().url().default(DEFAULT_ECM_URL),
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  TEMPLATES_DIR: z.string().optional(),
});

export type Config = z.infer<typeof envSchema> & { templatesDir: string };

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid configuration:\n${issues.join("\n")}`);
  }

  return {
    ...result.data,
    // Resolves to apps/gbx-service/templates from both src/ (tsx) and dist/ (bundle)
    templatesDir:
      result.data.TEMPLATES_DIR ?? fileURLToPath(new URL("../templates", import.meta.url)),
  };
}
