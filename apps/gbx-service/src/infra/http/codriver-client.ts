import { readSseEvents } from "@tmcontrolpanel/shared";
import type {
  CodriverAnswer,
  CodriverClient,
} from "../../core/chat/codriver-command";

function toAnswer(payload: {
  reply?: unknown;
  status?: unknown;
}): CodriverAnswer {
  if (typeof payload.reply !== "string") {
    throw new Error("Codriver returned no reply");
  }
  // Older panels send only the reply
  return typeof payload.status === "string"
    ? { reply: payload.reply, status: payload.status }
    : { reply: payload.reply };
}

// Calls the panel's internal Codriver route with the shared panel token
export class HttpCodriverClient implements CodriverClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    // Mode switches wait for the new script to load, so allow more than a model call.
    // A streamed answer gets this long between events, since a request in steps sends
    // progress as each step starts.
    private readonly timeoutMs = 45_000,
    // A streamed answer in steps never takes longer than this in total
    private readonly maxStreamMs = 5 * 60_000,
  ) {}

  ask(
    serverId: string,
    login: string,
    text: string,
    onProgress?: (text: string) => void,
  ): Promise<CodriverAnswer> {
    return this.post({ serverId, login, text }, onProgress);
  }

  async clear(serverId: string, login: string): Promise<void> {
    await this.post({ serverId, login, text: "", clear: true });
  }

  private async post(
    body: Record<string, unknown>,
    onProgress?: (text: string) => void,
  ): Promise<CodriverAnswer> {
    const controller = new AbortController();
    const total = setTimeout(() => controller.abort(), this.maxStreamMs);
    let idle = setTimeout(() => controller.abort(), this.timeoutMs);
    const active = () => {
      clearTimeout(idle);
      idle = setTimeout(() => controller.abort(), this.timeoutMs);
    };
    try {
      return await this.request(body, controller.signal, active, onProgress);
    } finally {
      clearTimeout(total);
      clearTimeout(idle);
    }
  }

  private async request(
    body: Record<string, unknown>,
    signal: AbortSignal,
    active: () => void,
    onProgress?: (text: string) => void,
  ): Promise<CodriverAnswer> {
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
        body: JSON.stringify(body),
        signal,
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
        active();
        const payload = JSON.parse(data) as {
          text?: unknown;
          reply?: unknown;
          status?: unknown;
        };
        if (event === "progress" && typeof payload.text === "string") {
          onProgress?.(payload.text);
        } else if (event === "reply") {
          return toAnswer(payload);
        } else if (event === "error") {
          throw new Error("Codriver reported an error");
        }
      }
      throw new Error("Codriver stream ended without a reply");
    }

    const json = (await response.json()) as {
      data?: { reply?: unknown; status?: unknown };
    };
    return toAnswer(json.data ?? {});
  }
}
