import type { Logger } from "../../core/logger";
import type { EcmClient } from "../../core/ports";

export const DEFAULT_ECM_URL = "https://us-central1-fantasy-trackmania.cloudfunctions.net";

// Fire-and-forget reporting; failures are logged, never thrown into the game loop
export class HttpEcmClient implements EcmClient {
  constructor(
    private readonly log: Logger,
    private readonly baseUrl = DEFAULT_ECM_URL,
    private readonly fetchImpl: typeof fetch = globalThis.fetch,
  ) {}

  driverFinish(apiKey: string, body: Parameters<EcmClient["driverFinish"]>[1]) {
    return this.post("match-addRoundTime", apiKey, body);
  }

  roundEnd(apiKey: string, body: Parameters<EcmClient["roundEnd"]>[1]) {
    return this.post("match-addRound", apiKey, body);
  }

  private async post(endpoint: string, apiKey: string, body: unknown): Promise<void> {
    const [matchId, authToken] = apiKey.split("_");
    if (!matchId || !authToken) {
      this.log.warn("Invalid ECM API key format");
      return;
    }

    try {
      const response = await this.fetchImpl(
        `${this.baseUrl}/${endpoint}?matchId=${encodeURIComponent(matchId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: authToken },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) {
        this.log.error(
          { endpoint, matchId, status: response.status, data: await response.text() },
          "ECM request failed",
        );
      }
    } catch (error) {
      this.log.error({ err: error, endpoint, matchId }, "ECM request failed");
    }
  }
}
