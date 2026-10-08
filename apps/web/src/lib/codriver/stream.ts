import { type CodriverProgress, encodeSseEvent } from "@gcp/shared";
import "server-only";

const KEEP_ALIVE_MS = 15_000;

export const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "private, no-store, no-transform",
  Connection: "keep-alive",
  // Stops nginx from buffering the stream
  "X-Accel-Buffering": "no",
};

// Streams `progress` events while `run` works, then one `reply` event with its result
export function codriverEventStream<T>(
  run: (onProgress: (progress: CodriverProgress) => void) => Promise<T>,
  signal: AbortSignal,
): Response {
  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      // A closed connection only stops the events; the request itself still finishes
      const send = (chunk: string) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          open = false;
        }
      };
      const close = () => {
        if (!open) return;
        open = false;
        clearInterval(timer);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
      signal.addEventListener("abort", close, { once: true });
      timer = setInterval(() => send(": keep-alive\n\n"), KEEP_ALIVE_MS);
      // Opens the stream at once so proxies don't wait for the first event
      send(": open\n\n");

      try {
        const result = await run((progress) =>
          send(encodeSseEvent("progress", progress)),
        );
        send(encodeSseEvent("reply", result));
      } catch {
        send(
          encodeSseEvent("error", {
            message: "Codriver is unavailable right now.",
          }),
        );
      } finally {
        close();
      }
    },
    cancel() {
      clearInterval(timer);
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
