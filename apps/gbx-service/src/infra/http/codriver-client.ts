import { readSseEvents } from "@gcp/shared";
import type { CodriverClient } from "../../core/chat/codriver-command";

// Calls the panel's internal Codriver route with the shared panel token
export class HttpCodriverClient implements CodriverClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    // Mode switches wait for the new script to load, so allow more than a model call
    private readonly timeoutMs = 45_000,
  ) {}

  async ask(
    serverId: string,
    login: string,
    text: string,
    onProgress?: (text: string) => void,
  ): Promise<string> {
    const response = await fetch(
      new URL("/api/internal/codriver", this.baseUrl),
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.token}`,
          "content-type": "application/json",
          // A stream carries progress lines; an older panel answers with plain JSON
          accept: "text/event-stream, application/json",
        },
        body: JSON.stringify({ serverId, login, text }),
        signal: AbortSignal.timeout(this.timeoutMs),
      },
    );
    if (!response.ok) {
      throw new Error(`Codriver request failed with status ${response.status}`);
    }

    if (
      response.body &&
      response.headers.get("content-type")?.includes("text/event-stream")
    ) {
      for await (const { event, data } of readSseEvents(response.body)) {
        const payload = JSON.parse(data) as { text?: unknown; reply?: unknown };
        if (event === "progress" && typeof payload.text === "string") {
          onProgress?.(payload.text);
        } else if (event === "reply" && typeof payload.reply === "string") {
          return payload.reply;
        } else if (event === "error") {
          throw new Error("Codriver reported an error");
        }
      }
      throw new Error("Codriver stream ended without a reply");
    }

    const body = (await response.json()) as { data?: { reply?: unknown } };
    if (typeof body.data?.reply !== "string") {
      throw new Error("Codriver returned no reply");
    }
    return body.data.reply;
  }
}
