import { NodeHandle } from "@/lib/server-manager/types";

// React Flow ids are `${tag}-${value}`, e.g. "LeaderboardV1-4".
export const toNodeId = (handle: NodeHandle) => `${handle.tag}-${handle.value}`;

export function toNodeHandle(id: string): NodeHandle {
  const [tag, value] = id.split("-");
  return { tag, value: Number(value) } as NodeHandle;
}

export const isSameNode = (a: NodeHandle | undefined, b: NodeHandle) => a?.tag === b.tag && a.value === b.value;
