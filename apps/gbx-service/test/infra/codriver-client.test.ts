import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpCodriverClient } from "../../src/infra/http/codriver-client";

// An SSE response that sends `events` with `gapMs` between them, honouring the abort signal
function streamFetch(events: string[], gapMs: number) {
  return vi.fn(async (_url: unknown, init: RequestInit) => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        init.signal?.addEventListener("abort", () =>
          controller.error(new Error("aborted")),
        );
        for (const event of events) {
          await new Promise((resolve) => setTimeout(resolve, gapMs));
          if (init.signal?.aborted) return;
          controller.enqueue(encoder.encode(event));
        }
        controller.close();
      },
    });
    return new Response(body, {
      headers: { "content-type": "text/event-stream" },
    });
  });
}

const progress = (text: string) =>
  `event: progress\ndata: ${JSON.stringify({ text })}\n\n`;
const reply = `event: reply\ndata: ${JSON.stringify({ reply: "Done.", status: "needs_confirmation" })}\n\n`;

afterEach(() => vi.unstubAllGlobals());

describe("HttpCodriverClient", () => {
  it("keeps a long request in steps open while progress arrives", async () => {
    vi.stubGlobal(
      "fetch",
      streamFetch(
        [
          progress("Step 1/3"),
          progress("Step 2/3"),
          progress("Step 3/3"),
          reply,
        ],
        30,
      ),
    );
    const client = new HttpCodriverClient("http://panel", "token", 60, 1000);
    const seen: string[] = [];
    expect(
      await client.ask("s", "abc", "text", (text) => seen.push(text)),
    ).toEqual({ reply: "Done.", status: "needs_confirmation" });
    expect(seen).toEqual(["Step 1/3", "Step 2/3", "Step 3/3"]);
  });

  it("clears the conversation and reads replies from older panels", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ data: { reply: "Conversation cleared." } }),
          {
            headers: { "content-type": "application/json" },
          },
        ),
    );
    vi.stubGlobal("fetch", fetch);
    const client = new HttpCodriverClient("http://panel", "token");
    await client.clear("s", "abc");
    const [, init] = fetch.mock.calls[0] as unknown as [unknown, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      serverId: "s",
      login: "abc",
      text: "",
      clear: true,
    });
    expect(await client.ask("s", "abc", "status")).toEqual({
      reply: "Conversation cleared.",
    });
  });

  it("gives up when the panel goes quiet or the request runs too long", async () => {
    vi.stubGlobal("fetch", streamFetch([progress("a"), reply], 100));
    await expect(
      new HttpCodriverClient("http://panel", "token", 50, 1000).ask(
        "s",
        "abc",
        "text",
      ),
    ).rejects.toThrow();

    vi.stubGlobal(
      "fetch",
      streamFetch([progress("a"), progress("b"), progress("c"), reply], 30),
    );
    await expect(
      new HttpCodriverClient("http://panel", "token", 60, 70).ask(
        "s",
        "abc",
        "text",
      ),
    ).rejects.toThrow();
  });
});
