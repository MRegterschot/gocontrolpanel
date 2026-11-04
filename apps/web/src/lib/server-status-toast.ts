import type { HandoverEvent } from "@tmcontrolpanel/shared";

export function serverStatusToast(
  type: string,
  name: string,
  kind: HandoverEvent["kind"] | undefined,
  snapshotAt: number,
  now: number,
) {
  if (!snapshotAt || now - snapshotAt < 2000) return null;
  if (type === "connect")
    return { level: "success" as const, message: `${name} connected` };
  if (type === "disconnect")
    return { level: "warning" as const, message: `${name} disconnected` };
  if (type !== "handover" || !kind) return null;
  const messages = {
    moved: "moved to another worker",
    restarted: "taken over after a controller restart",
    resumed: "released from hold",
    lease: "taken over after a worker lost its Redis connection",
    crashed: "recovered after a controller crash",
  };
  return {
    level: kind === "crashed" ? ("error" as const) : ("success" as const),
    message: `${name} ${messages[kind]}`,
    description:
      kind === "crashed"
        ? "The round in progress was not recorded."
        : undefined,
  };
}
