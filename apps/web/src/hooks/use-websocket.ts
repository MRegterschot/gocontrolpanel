import { logger } from "@/lib/logger";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef } from "react";

interface WebSocketProps {
  // Channel path on the GBX service, see wsPaths in @gcp/shared
  path: string;
  onMessage: (type: string, data: any) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

// Close codes after which reconnecting cannot succeed: forbidden, server not managed, server removed
const FINAL_CLOSE_CODES = new Set([4403, 4404, 1001]);
const MAX_RETRY_DELAY_MS = 30_000;

async function fetchTicket(): Promise<{ ticket: string; url: string }> {
  const res = await fetch("/api/ws-ticket", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to get a WebSocket ticket (${res.status})`);
  }
  return res.json();
}

export default function useWebSocket({
  path,
  onMessage,
  onError,
  onOpen,
  onClose,
}: WebSocketProps) {
  const { status } = useSession();
  const wsRef = useRef<WebSocket | null>(null);

  const stableOnMessage = useCallback(onMessage, []);
  const stableOnError = useCallback(onError ?? (() => {}), []);
  const stableOnOpen = useCallback(onOpen ?? (() => {}), []);
  const stableOnClose = useCallback(onClose ?? (() => {}), []);

  useEffect(() => {
    if (status !== "authenticated") return;

    const meta = { type: "hook", module: "useWebSocket", path };
    let disposed = false;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    // Every channel sends its current state on open, so a reconnect also resyncs
    const scheduleReconnect = () => {
      if (disposed) return;
      const delay = Math.min(1000 * 2 ** attempt, MAX_RETRY_DELAY_MS);
      attempt++;
      retryTimer = setTimeout(connect, delay);
    };

    const connect = async () => {
      let ticket: { ticket: string; url: string };
      try {
        ticket = await fetchTicket();
      } catch (error) {
        logger.warn({ meta, error }, "Could not get a WebSocket ticket");
        scheduleReconnect();
        return;
      }
      if (disposed) return;

      const ws = new WebSocket(
        `${ticket.url}${path}?ticket=${encodeURIComponent(ticket.ticket)}`,
      );
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        stableOnMessage(data.type, data.data);
      };

      ws.onopen = () => {
        attempt = 0;
        stableOnOpen();
      };

      ws.onerror = (error) => {
        ws.close();
        stableOnError(error);
      };

      ws.onclose = (event) => {
        if (wsRef.current === ws) wsRef.current = null;
        stableOnClose();
        if (FINAL_CLOSE_CODES.has(event.code)) {
          logger.debug({ meta, code: event.code, reason: event.reason }, "WebSocket closed for good");
          return;
        }
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      if (wsRef.current) {
        logger.trace({ meta }, "Cleaning up WebSocket connection");
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [
    path,
    status,
    stableOnMessage,
    stableOnError,
    stableOnOpen,
    stableOnClose,
  ]);

  return wsRef;
}
