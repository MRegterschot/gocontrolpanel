import { openChannelSocket, type Ticket } from "@/lib/channel-socket";
import { logger } from "@/lib/logger";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef } from "react";

interface WebSocketProps {
  // Channel path on the GBX service, see wsPaths in @tmcp/shared
  path: string;
  onMessage: (type: string, data: any) => void;
  onError?: (error: unknown) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

async function fetchTicket(): Promise<Ticket> {
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

    return openChannelSocket({
      path,
      fetchTicket,
      createSocket: (url) => new WebSocket(url),
      onMessage: stableOnMessage,
      onError: stableOnError,
      onOpen: stableOnOpen,
      onClose: stableOnClose,
      onSocket: (socket) => {
        wsRef.current = socket as WebSocket | null;
      },
      log: logger,
      meta: { type: "hook", module: "useWebSocket" },
    });
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
