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
  // Channel path on the GBX service, see wsPaths in @tmcp/shared
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

// Forbidden: reconnecting cannot succeed unless the permissions change
const FINAL_CLOSE_CODES = new Set([4403]);
// The service does not manage the server. Usually it has not registered a just-created server yet, so
// retry a few times, but not forever for a server that does not exist.
const NOT_FOUND_CLOSE_CODE = 4404;
const MAX_NOT_FOUND_RETRIES = 5;
const MAX_RETRY_DELAY_MS = 30_000;
// The service can accept a socket and close it straight away (4404), so opening is not proof of a
// healthy connection. The backoff starts over once a socket has stayed open this long.
const STABLE_AFTER_MS = 10_000;

// Connects, reconnects with a growing delay and resyncs (every channel sends its state on open).
// Returns a function that stops everything.
export function openChannelSocket(options: ChannelSocketOptions): () => void {
  const { path, log } = options;
  const meta = { ...options.meta, path };
  let disposed = false;
  let attempt = 0;
  let notFoundCloses = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let stableTimer: ReturnType<typeof setTimeout> | undefined;
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
      stableTimer = setTimeout(() => {
        attempt = 0;
        notFoundCloses = 0;
      }, STABLE_AFTER_MS);
      options.onOpen?.();
    };

    ws.onerror = (error) => {
      ws.close();
      options.onError?.(error);
    };

    ws.onclose = (event: { code: number; reason: string }) => {
      clearTimeout(stableTimer);
      if (socket === ws) setSocket(null);
      options.onClose?.();

      const giveUp =
        FINAL_CLOSE_CODES.has(event.code) ||
        (event.code === NOT_FOUND_CLOSE_CODE && ++notFoundCloses > MAX_NOT_FOUND_RETRIES);
      if (giveUp) {
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
    clearTimeout(stableTimer);
    if (socket) {
      log.trace({ meta }, "Cleaning up WebSocket connection");
      socket.close();
      setSocket(null);
    }
  };
}
