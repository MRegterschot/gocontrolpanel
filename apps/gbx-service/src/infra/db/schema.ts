import type { DbClient } from "@tmcontrolpanel/db";
import type { Logger } from "../../core/logger";

declare const __TMCP_LATEST_MIGRATION__: string | undefined;

// Newest migration this build's Prisma client expects; unset when running from source
export const LATEST_MIGRATION =
  typeof __TMCP_LATEST_MIGRATION__ === "string"
    ? __TMCP_LATEST_MIGRATION__
    : undefined;

// MySQL 1146 and PostgreSQL 42P01: table does not exist (raw queries report P2010)
const isMissingTable = (error: unknown) => {
  const e = error as { code?: string; meta?: { code?: string } } | null;
  if (e?.code === "P2021") return true;
  return e?.code === "P2010" && ["1146", "42P01"].includes(e.meta?.code ?? "");
};

async function migrationApplied(db: DbClient, name: string): Promise<boolean> {
  const rows = await db.$queryRaw<{ n: bigint | number }[]>`
    SELECT COUNT(*) AS n FROM _prisma_migrations
    WHERE migration_name = ${name} AND finished_at IS NOT NULL AND rolled_back_at IS NULL`;
  return Number(rows[0]?.n ?? 0) > 0;
}

// The service can start before the web app has finished applying migrations,
// so wait until the newest migration this build knows about is done
export async function waitForSchema(
  db: DbClient,
  log: Logger,
  timeoutMs = 300_000,
  delayMs = 2_000,
  latestMigration = LATEST_MIGRATION,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let logged = false;
  for (;;) {
    let ready = false;
    try {
      if (latestMigration) ready = await migrationApplied(db, latestMigration);
      else ready = (await db.plugins.count(), true);
    } catch (error) {
      if (!isMissingTable(error)) throw error;
    }
    if (ready) return;
    if (Date.now() >= deadline)
      throw new Error(
        `Database schema not ready after ${Math.round(timeoutMs / 1000)}s` +
          (latestMigration
            ? ` (waiting for migration ${latestMigration})`
            : ""),
      );
    if (!logged)
      log.warn({ latestMigration }, "Database migrations pending, waiting");
    logged = true;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}
