import type { CodriverClient } from "../../core/chat/codriver-command";

// Calls the panel's internal Codriver route with the shared panel token
export class HttpCodriverClient implements CodriverClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    // Mode switches wait for the new script to load, so allow more than a model call
    private readonly timeoutMs = 45_000,
  ) {}

  async ask(serverId: string, login: string, text: string): Promise<string> {
    const response = await fetch(
      new URL("/api/internal/codriver", this.baseUrl),
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ serverId, login, text }),
        signal: AbortSignal.timeout(this.timeoutMs),
      },
    );
    if (!response.ok) {
      throw new Error(`Codriver request failed with status ${response.status}`);
    }
    const body = (await response.json()) as { data?: { reply?: unknown } };
    if (typeof body.data?.reply !== "string") {
      throw new Error("Codriver returned no reply");
    }
    return body.data.reply;
  }
}
