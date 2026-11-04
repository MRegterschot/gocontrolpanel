import type { DbClient } from "@tmcontrolpanel/db";
import type { Logger } from "../../core/logger";

const isMissingTable = (error: unknown) =>
  (error as { code?: string } | null)?.code === "P2021";

// On a fresh deployment the service can start before the web app has applied the migrations
export async function waitForSchema(
  db: DbClient,
  log: Logger,
  timeoutMs = 300_000,
  delayMs = 2_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let logged = false;
  for (;;) {
    try {
      await db.plugins.count();
      return;
    } catch (error) {
      if (!isMissingTable(error) || Date.now() >= deadline) throw error;
      if (!logged) log.warn("Database tables missing, waiting for migrations");
      logged = true;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
