import { getClient } from "@/lib/dbclient";
import { logger } from "@/lib/logger";
import "server-only";

export interface PublicStats {
  servers: number;
  players: number;
  maps: number;
  matches: number;
  records: number;
}

// The landing page is public, so every anonymous visit would otherwise run five
// counts, one of them over the whole records table
const TTL_MS = 10 * 60 * 1000;

let cached: { stats: PublicStats; at: number } | null = null;
let inFlight: Promise<PublicStats> | null = null;

async function countAll(): Promise<PublicStats> {
  const db = getClient();
  const [servers, players, maps, matches, records] = await Promise.all([
    db.servers.count({ where: { deletedAt: null } }),
    db.users.count(),
    db.maps.count({ where: { deletedAt: null } }),
    db.matches.count({ where: { deletedAt: null } }),
    db.records.count({ where: { deletedAt: null } }),
  ]);
  return { servers, players, maps, matches, records };
}

// Totals only, nothing that identifies a server or a player. Returns null when the
// database can't be reached, so the page still renders without them.
export async function getPublicStats(): Promise<PublicStats | null> {
  if (cached && Date.now() - cached.at < TTL_MS) {
    return cached.stats;
  }

  // Concurrent visitors after an expiry share one round of counts
  inFlight ??= countAll().finally(() => {
    inFlight = null;
  });

  try {
    const stats = await inFlight;
    cached = { stats, at: Date.now() };
    return stats;
  } catch (error) {
    const meta = {
      type: "database",
      module: "stats",
      function: "getPublicStats",
    };
    logger.error({ meta, error }, "Failed to count public stats");
    // A stale number is better than none
    return cached?.stats ?? null;
  }
}
