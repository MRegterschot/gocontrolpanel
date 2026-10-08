import { readSseEvents } from "@gcp/shared";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { notify, runningProgress } from "@/lib/codriver/progress";
import { codriverEventStream } from "@/lib/codriver/stream";

async function collect(response: Response) {
  const events = [];
  for await (const event of readSseEvents(response.body!)) events.push(event);
  return events;
}

describe("codriverEventStream", () => {
  it("sends progress events and then the reply", async () => {
    const response = codriverEventStream(async (onProgress) => {
      onProgress({ stage: "planning", text: "Working out what to do…" });
      return { reply: "Done." };
    }, new AbortController().signal);

    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(response.headers.get("x-accel-buffering")).toBe("no");
    expect(await collect(response)).toEqual([
      {
        event: "progress",
        data: JSON.stringify({
          stage: "planning",
          text: "Working out what to do…",
        }),
      },
      { event: "reply", data: JSON.stringify({ reply: "Done." }) },
    ]);
  });

  it("reports a failure as an error event without leaking the message", async () => {
    const response = codriverEventStream(async () => {
      throw new Error("redis password wrong");
    }, new AbortController().signal);
    const [event] = await collect(response);
    expect(event.event).toBe("error");
    expect(event.data).not.toContain("redis");
  });

  it("still finishes the work when the client disconnects", async () => {
    const controller = new AbortController();
    let finished = false;
    codriverEventStream(async (onProgress) => {
      controller.abort();
      onProgress({ stage: "running", text: "Running: skip map…" });
      finished = true;
      return {};
    }, controller.signal);
    await vi.waitFor(() => expect(finished).toBe(true));
  });
});

describe("progress helpers", () => {
  it("names the tools being run", () => {
    expect(
      runningProgress([
        { tool: "skip_map", input: {} },
        { tool: "restart_map", input: {} },
      ]).text,
    ).toBe("Running: skip map, then restart map…");
  });

  it("ignores a listener that throws", () => {
    expect(() =>
      notify(() => {
        throw new Error("closed");
      }, runningProgress([])),
    ).not.toThrow();
  });
});
