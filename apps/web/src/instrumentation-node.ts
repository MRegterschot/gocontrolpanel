import { syncAllMaps } from "./actions/database/server-only/gbx";
import { assertGbxServiceConfig } from "./lib/config-check";
import config from "./lib/config";
import {
  authenticate,
  authenticateCredentials,
  getCredentialsToken,
  getTokens,
} from "./lib/api/nadeo";

export async function registerNode() {
  assertGbxServiceConfig(config.GBX_SERVICE);

  const tokens = await getTokens();
  if (!tokens) {
    await authenticate();
  }
  const credentialsToken = await getCredentialsToken();
  if (!credentialsToken) {
    await authenticateCredentials();
  }
  syncAllMaps();
}
