// Client for a live channel of the GBX service. Kept free of React and browser globals so it can be tested.

// The part of WebSocket used here. Event parameters are `any` so the real WebSocket is assignable.
export interface SocketLike {
  onopen: ((event: any) => void) | null;
  onmessage: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onclose: ((event: any) => void) | null;
  close(): void;
}

export interface Ticket {
  ticket: string;
  url: string;
}

export interface ChannelLogger {
  warn(obj: object, msg: string): void;
  error(obj: object, msg: string): void;
  debug(obj: object, msg: string): void;
  trace(obj: object, msg: string): void;
}

export interface ChannelSocketOptions {
  // Channel path on the GBX service, see wsPaths in @gcp/shared
  path: string;
  fetchTicket: () => Promise<Ticket>;
  createSocket: (url: string) => SocketLike;
  onMessage: (type: string, data: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  // Also called for failures before a socket exists (ticket fetch, socket creation)
  onError?: (error: unknown) => void;
  onSocket?: (socket: SocketLike | null) => void;
  log: ChannelLogger;
  meta?: object;
}

// Close codes after which reconnecting cannot succeed: forbidden, server not managed, server removed
const FINAL_CLOSE_CODES = new Set([4403, 4404, 1001]);
const MAX_RETRY_DELAY_MS = 30_000;

// Connects, reconnects with a growing delay and resyncs (every channel sends its state on open).
// Returns a function that stops everything.
export function openChannelSocket(options: ChannelSocketOptions): () => void {
  const { path, log } = options;
  const meta = { ...options.meta, path };
  let disposed = false;
  let attempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let socket: SocketLike | null = null;

  const setSocket = (next: SocketLike | null) => {
    socket = next;
    options.onSocket?.(next);
  };

  const scheduleReconnect = () => {
    if (disposed) return;
    const delay = Math.min(1000 * 2 ** attempt, MAX_RETRY_DELAY_MS);
    attempt++;
    retryTimer = setTimeout(connect, delay);
  };

  const connect = async () => {
    let ticket: Ticket;
    try {
      ticket = await options.fetchTicket();
    } catch (error) {
      log.warn({ meta, error }, "Could not get a WebSocket ticket");
      options.onError?.(error);
      scheduleReconnect();
      return;
    }
    if (disposed) return;

    let ws: SocketLike;
    try {
      ws = options.createSocket(
        `${ticket.url}${path}?ticket=${encodeURIComponent(ticket.ticket)}`,
      );
    } catch (error) {
      // A bad URL or a blocked scheme (ws:// on an https page): retrying cannot fix it
      log.error({ meta, error }, "Could not open the WebSocket, not retrying");
      options.onError?.(error);
      return;
    }
    setSocket(ws);

    ws.onmessage = (event: { data: string }) => {
      const data = JSON.parse(event.data);
      options.onMessage(data.type, data.data);
    };

    ws.onopen = () => {
      attempt = 0;
      options.onOpen?.();
    };

    ws.onerror = (error) => {
      ws.close();
      options.onError?.(error);
    };

    ws.onclose = (event: { code: number; reason: string }) => {
      if (socket === ws) setSocket(null);
      options.onClose?.();
      if (FINAL_CLOSE_CODES.has(event.code)) {
        log.debug({ meta, code: event.code, reason: event.reason }, "WebSocket closed for good");
        return;
      }
      scheduleReconnect();
    };
  };

  void connect();

  return () => {
    disposed = true;
    clearTimeout(retryTimer);
    if (socket) {
      log.trace({ meta }, "Cleaning up WebSocket connection");
      socket.close();
      setSocket(null);
    }
  };
}
