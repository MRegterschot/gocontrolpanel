import { NodeHandle } from "@/lib/server-manager/types";

// React Flow ids are `${tag}-${value}`, e.g. "LeaderboardV1-4".
export const toNodeId = (handle: NodeHandle) => `${handle.tag}-${handle.value}`;

export function toNodeHandle(id: string): NodeHandle {
  const [tag, value] = id.split("-");
  return { tag, value: Number(value) } as NodeHandle;
}

const VARIANTS: NodeHandle["tag"][] = ["MatchV1", "CompetitionV1", "ScheduleV1", "ServerV1", "InputV1", "OutputV1", "RegistrationV1", "LeaderboardV1"];

// Tables like the server occupation store a handle as a 1 based variant number and an id.
export const isNode = (handle: NodeHandle, row: { nodeVariant: number; nodeId: number }) =>
  row.nodeVariant === VARIANTS.indexOf(handle.tag) + 1 && row.nodeId === handle.value;
