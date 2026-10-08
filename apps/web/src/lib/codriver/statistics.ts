import type { CodriverUsage, CodriverUsageBucket } from "@/types/codriver";

export interface UsageRecord {
  serverId: string;
  createdAt: Date;
  status: string;
  keySource: string;
  model: string | null;
  modelCalls: number | null;
  costMicros: number;
  toolCalls: unknown;
}
export interface UsageServer {
  id: string;
  name: string;
  groups: { id: string; name: string }[];
}

// Incremental aggregation keeps memory bounded and uses the same UTC month on both databases.
export function usageAccumulator(now: Date, servers: UsageServer[]) {
  const month = now.toISOString().slice(0, 7);
  const daily = new Map<
    string,
    { date: string; requests: number; costMicros: number }
  >(
    Array.from({ length: now.getUTCDate() }, (_, index) => {
      const date = `${month}-${String(index + 1).padStart(2, "0")}`;
      return [date, { date, requests: 0, costMicros: 0 }] as const;
    }),
  );
  const serverById = new Map(servers.map((server) => [server.id, server]));
  const tools = new Map<string, number>();
  const keys = new Map<string, CodriverUsageBucket>();
  const serverTotals = new Map<string, CodriverUsageBucket>();
  const groups = new Map<string, CodriverUsageBucket>();
  let requests = 0,
    costMicros = 0,
    failed = 0,
    modelRequests = 0,
    escalated = 0,
    untrackedModelRequests = 0;
  function addBucket(
    map: Map<string, CodriverUsageBucket>,
    id: string,
    name: string,
    cost: number,
  ) {
    const entry = map.get(id) ?? { id, name, requests: 0, costMicros: 0 };
    entry.requests++;
    entry.costMicros += cost;
    map.set(id, entry);
  }
  return {
    add(rows: UsageRecord[]) {
      for (const row of rows) {
        const day = daily.get(row.createdAt.toISOString().slice(0, 10));
        if (!day || row.createdAt > now) continue;
        requests++;
        costMicros += row.costMicros;
        failed += Number(row.status === "failed");
        modelRequests += Number((row.modelCalls ?? 0) > 0);
        escalated += Number((row.modelCalls ?? 0) > 1);
        untrackedModelRequests += Number(
          row.modelCalls === null && row.model !== null,
        );
        day.requests++;
        day.costMicros += row.costMicros;
        if (Array.isArray(row.toolCalls)) {
          const names = new Set(
            row.toolCalls.flatMap((call: unknown) =>
              call &&
              typeof call === "object" &&
              "tool" in call &&
              typeof call.tool === "string"
                ? [call.tool]
                : [],
            ),
          );
          for (const name of names) tools.set(name, (tools.get(name) ?? 0) + 1);
        }
        addBucket(
          keys,
          row.keySource,
          row.keySource === "none"
            ? "No model cost"
            : row.keySource === "shared"
              ? "Shared key"
              : "Server key",
          row.costMicros,
        );
        const server = serverById.get(row.serverId);
        addBucket(
          serverTotals,
          row.serverId,
          server?.name ?? row.serverId,
          row.costMicros,
        );
        for (const group of server?.groups ?? [])
          addBucket(groups, group.id, group.name, row.costMicros);
      }
    },
    result(): CodriverUsage {
      const sorted = (map: Map<string, CodriverUsageBucket>) =>
        [...map.values()].sort(
          (a, b) =>
            b.costMicros - a.costMicros ||
            b.requests - a.requests ||
            a.id.localeCompare(b.id),
        );
      return {
        month,
        requests,
        costMicros,
        failed,
        modelRequests,
        escalated,
        untrackedModelRequests,
        daily: [...daily.values()],
        tools: [...tools]
          .map(([name, requests]) => ({ name, requests }))
          .sort(
            (a, b) => b.requests - a.requests || a.name.localeCompare(b.name),
          )
          .slice(0, 10),
        byKey: sorted(keys),
        byServer: sorted(serverTotals),
        byGroup: sorted(groups),
      };
    },
  };
}
