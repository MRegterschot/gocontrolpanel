import type { Actor } from "@/lib/actor";
import { getMapListAs } from "@/services/database/maps";
import { ServerError } from "@/types/responses";
import "server-only";

// The whole map list in server order; the panel treats an empty list as a failure, the API does not
export async function mapListOf(actor: Actor, serverId: string) {
  try {
    return await getMapListAs(actor, serverId);
  } catch (error) {
    if (error instanceof ServerError && error.name === "MapListEmpty") {
      return [];
    }
    throw error;
  }
}

// The items in the order of uids, which must name every item exactly once
export function inUidOrder<T>(
  items: T[],
  uids: string[],
  uidOf: (item: T) => string,
): T[] {
  const remaining = [...items];
  const ordered = uids.map((uid) => {
    const index = remaining.findIndex((item) => uidOf(item) === uid);
    if (index === -1) {
      throw new ServerError(
        `uids lists ${uid} more often than it appears`,
        "ValidationError",
      );
    }
    return remaining.splice(index, 1)[0];
  });
  if (remaining.length > 0) {
    throw new ServerError(
      `uids misses ${remaining.length} of the current entries`,
      "ValidationError",
    );
  }
  return ordered;
}
