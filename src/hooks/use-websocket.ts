import { logger } from "@/lib/logger";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef } from "react";

interface WebSocketProps {
  url: string;
  onMessage: (type: string, data: any) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export default function useWebSocket({
  url,
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

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      stableOnMessage(data.type, data.data);
    };

    ws.onclose = () => {
      stableOnClose();
    };

    ws.onerror = (error) => {
      ws.close();
      stableOnError(error);
    };

    ws.onopen = stableOnOpen;

    return () => {
      if (wsRef.current) {
        logger.trace("Cleaning up WebSocket connection");
        wsRef.current.close();
      }
    };
  }, [
    url,
    status,
    stableOnMessage,
    stableOnError,
    stableOnOpen,
    stableOnClose,
  ]);

  return wsRef;
}
