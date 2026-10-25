import { z } from "zod";

// Redis pub/sub channel the web app publishes to after changing server rows
export const SERVER_EVENTS_CHANNEL = "tmcp:server-events";

export const serverLifecycleEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("server.created"), serverId: z.string() }),
  // Connection details changed (host/port/credentials/name)
  z.object({ type: z.literal("server.updated"), serverId: z.string() }),
  z.object({ type: z.literal("server.deleted"), serverId: z.string() }),
  // server_plugins rows changed (enabled flags or config)
  z.object({ type: z.literal("server.plugins.updated"), serverId: z.string() }),
]);

export type ServerLifecycleEvent = z.infer<typeof serverLifecycleEventSchema>;

export function encodeServerLifecycleEvent(event: ServerLifecycleEvent): string {
  return JSON.stringify(serverLifecycleEventSchema.parse(event));
}

// Returns null for malformed messages instead of throwing inside a subscriber
export function decodeServerLifecycleEvent(
  raw: string,
): ServerLifecycleEvent | null {
  try {
    const result = serverLifecycleEventSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export interface EventTransport {
  name: string;
  send(event: ServerLifecycleEvent): Promise<void>;
}

export interface DeliveryResult {
  // Name of the transport that accepted the event, null when all of them failed
  deliveredBy: string | null;
  failures: { transport: string; error: unknown }[];
}

// Tries the transports in order and stops at the first one that accepts the event
export async function deliverServerEvent(
  event: ServerLifecycleEvent,
  transports: EventTransport[],
): Promise<DeliveryResult> {
  const failures: DeliveryResult["failures"] = [];

  for (const transport of transports) {
    try {
      await transport.send(event);
      return { deliveredBy: transport.name, failures };
    } catch (error) {
      failures.push({ transport: transport.name, error });
    }
  }

  return { deliveredBy: null, failures };
}

export const redisKeys = {
  // List of JSON JukeboxEntry, head is played next; written by web, popped by the GBX service
  jukebox: (serverId: string) => `jukebox:${serverId}`,
} as const;

export interface JukeboxEntry {
  fileName: string;
  uid?: string;
  name?: string;
  [key: string]: unknown;
}
