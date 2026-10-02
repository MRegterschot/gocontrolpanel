import { syncAllMaps } from "./actions/database/server-only/gbx";
import {
  authenticate,
  authenticateCredentials,
  getCredentialsToken,
  getTokens,
} from "./lib/api/nadeo";

export async function registerNode() {
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
