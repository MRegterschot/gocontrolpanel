// Prints a live WebSocket channel of a locally running GBX service.
// Usage: ws-watch <servers|clients|notifications|live|map|players> [serverId] [--user <id>] [--full]
import { signWsTicket, sessionClaimsSchema } from "@tmcp/shared";
import WebSocket from "ws";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args.splice(index, 2)[1];
};
const full = args.includes("--full");
const userId = flag("--user") ?? "e2e-admin";
const [channel, serverId = process.env.E2E_SERVER_ID ?? "e2e-server"] = args.filter((a) => !a.startsWith("--"));

const perServer = ["live", "map", "players"];
if (!channel || ![...perServer, "servers", "clients", "notifications"].includes(channel)) {
  console.error("Usage: ws-watch <servers|clients|notifications|live|map|players> [serverId] [--user <id>] [--full]");
  process.exit(1);
}

const secret = process.env.WS_TICKET_SECRET;
if (!secret) throw new Error("WS_TICKET_SECRET is required");

// Admin claims that can see the e2e server through every access rule
const claims = sessionClaimsSchema.parse({
  id: userId,
  admin: true,
  permissions: ["servers:clients:view"],
  servers: [{ id: serverId, name: "TMCP e2e", role: "Admin" }],
  groups: [{ id: "e2e", name: "e2e", role: "Admin", servers: [{ id: serverId, name: "TMCP e2e" }] }],
});

function summarize(type: string, data: any): string {
  if (full) return JSON.stringify(data, null, 2);
  const round = data?.round?.players;
  if (round) {
    return Object.values(round)
      .map((p: any) => `${p.login}:cp${p.checkpoint}${p.hasFinished ? "✓" : ""}${p.hasGivenUp ? "✗" : ""}@${p.time}`)
      .join(" ");
  }
  if (data?.info) {
    const i = data.info;
    return `type=${i.type} map=${i.currentMap} warmUp=${i.isWarmUp} paused=${i.isPaused} limit=${i.pointsLimit} players=${Object.keys(i.players ?? {}).length}`;
  }
  return JSON.stringify(data).slice(0, 200);
}

const base = process.env.GBX_SERVICE_WS_URL ?? `ws://localhost:${process.env.PORT ?? 3101}`;
const path = perServer.includes(channel) ? `/ws/${channel}/${serverId}` : `/ws/${channel}`;
const ticket = await signWsTicket(claims, secret);
const socket = new WebSocket(`${base}${path}?ticket=${ticket}`);

socket.on("open", () => console.log(`connected to ${path}`));
socket.on("message", (raw) => {
  const { type, data } = JSON.parse(String(raw));
  console.log(`${new Date().toISOString().slice(11, 23)} ${type.padEnd(18)} ${summarize(type, data)}`);
});
socket.on("close", (code, reason) => {
  console.log(`closed ${code} ${reason}`);
  process.exit(code === 1000 ? 0 : 1);
});
