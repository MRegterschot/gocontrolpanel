import { getAllServers, syncAllMaps } from "./actions/database/server-only/gbx";
import {
  authenticate,
  authenticateCredentials,
  getCredentialsToken,
  getTokens,
} from "./lib/api/nadeo";
import { getGbxClientManager } from "./lib/managers/gbxclient-manager";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }

  const tokens = await getTokens();
  if (!tokens) {
    await authenticate();
  }
  const credentialsToken = await getCredentialsToken();
  if (!credentialsToken) {
    await authenticateCredentials();
  }
  syncAllMaps();
  const servers = await getAllServers();
  for (const server of servers) {
    getGbxClientManager(server.id);
  }
}
