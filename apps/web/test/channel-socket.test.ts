import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  openChannelSocket,
  type ChannelSocketOptions,
  type SocketLike,
  type Ticket,
} from "../src/lib/channel-socket";

class FakeSocket implements SocketLike {
  onopen: SocketLike["onopen"] = null;
  onmessage: SocketLike["onmessage"] = null;
  onerror: SocketLike["onerror"] = null;
  onclose: SocketLike["onclose"] = null;
  closed = false;

  constructor(readonly url: string) {}

  close() {
    this.closed = true;
  }

  open() {
    this.onopen?.({});
  }
  message(type: string, data: unknown) {
    this.onmessage?.({ data: JSON.stringify({ type, data }) });
  }
  fail() {
    this.onerror?.({ type: "error" });
  }
  closeWith(code: number, reason = "") {
    this.onclose?.({ code, reason });
  }
}

const ticket: Ticket = { ticket: "a b", url: "ws://service:3100" };
const silent = { warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() };

function setup(overrides: Partial<ChannelSocketOptions> = {}) {
  const sockets: FakeSocket[] = [];
  const options = {
    path: "/ws/servers",
    fetchTicket: vi.fn(async () => ticket),
    createSocket: vi.fn((url: string) => {
      const socket = new FakeSocket(url);
      sockets.push(socket);
      return socket;
    }),
    onMessage: vi.fn(),
    onOpen: vi.fn(),
    onClose: vi.fn(),
    onError: vi.fn(),
    onSocket: vi.fn(),
    log: silent,
    ...overrides,
  } satisfies ChannelSocketOptions;
  const stop = openChannelSocket(options);
  return { options, sockets, stop };
}

// Lets the awaited ticket fetch settle
const settle = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("connecting", () => {
  it("opens the channel with the encoded ticket and forwards messages", async () => {
    const { options, sockets } = setup();
    await settle();

    expect(sockets[0].url).toBe("ws://service:3100/ws/servers?ticket=a%20b");

    sockets[0].message("servers", [{ id: "s1" }]);
    expect(options.onMessage).toHaveBeenCalledWith("servers", [{ id: "s1" }]);

    sockets[0].open();
    expect(options.onOpen).toHaveBeenCalledTimes(1);
  });

  it("reports the current socket and clears it when the socket closes", async () => {
    const { options, sockets } = setup();
    await settle();
    expect(options.onSocket).toHaveBeenLastCalledWith(sockets[0]);

    sockets[0].closeWith(1006);
    expect(options.onSocket).toHaveBeenLastCalledWith(null);
    expect(options.onClose).toHaveBeenCalledTimes(1);
  });
});

describe("errors before a socket exists", () => {
  it("reports a failed ticket fetch to onError and retries with a growing delay", async () => {
    const error = new Error("ticket 500");
    const fetchTicket = vi.fn<() => Promise<Ticket>>().mockRejectedValue(error);
    const { options } = setup({ fetchTicket });
    await settle();

    expect(options.onError).toHaveBeenCalledWith(error);
    expect(fetchTicket).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchTicket).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetchTicket).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(4000);
    expect(fetchTicket).toHaveBeenCalledTimes(4);
    expect(options.onError).toHaveBeenCalledTimes(4);
  });

  it("caps the retry delay at 30 s", async () => {
    const fetchTicket = vi.fn<() => Promise<Ticket>>().mockRejectedValue(new Error("down"));
    setup({ fetchTicket });
    await settle();

    // 1 + 2 + 4 + 8 + 16 = 31 s for the first five retries, then 30 s each
    await vi.advanceTimersByTimeAsync(31_000);
    expect(fetchTicket).toHaveBeenCalledTimes(6);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(fetchTicket).toHaveBeenCalledTimes(7);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(fetchTicket).toHaveBeenCalledTimes(8);
  });

  it("connects once the ticket service is back", async () => {
    const fetchTicket = vi
      .fn<() => Promise<Ticket>>()
      .mockRejectedValueOnce(new Error("starting"))
      .mockResolvedValue(ticket);
    const { sockets } = setup({ fetchTicket });
    await settle();
    expect(sockets).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(1000);
    expect(sockets).toHaveLength(1);
  });

  it("reports a socket that cannot be created and does not retry", async () => {
    const error = new SyntaxError("The URL 'nope' is invalid");
    const createSocket = vi.fn(() => {
      throw error;
    });
    const { options } = setup({ createSocket });
    // An unhandled rejection would fail the whole test run
    await settle();

    expect(options.onError).toHaveBeenCalledWith(error);
    expect(silent.error).toHaveBeenCalled();
    expect(options.onSocket).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(120_000);
    expect(options.fetchTicket).toHaveBeenCalledTimes(1);
    expect(createSocket).toHaveBeenCalledTimes(1);
  });
});

describe("reconnecting", () => {
  it("closes a socket that errors and reconnects after it closes", async () => {
    const { options, sockets } = setup();
    await settle();

    sockets[0].fail();
    expect(sockets[0].closed).toBe(true);
    expect(options.onError).toHaveBeenCalledTimes(1);

    sockets[0].closeWith(1006);
    await vi.advanceTimersByTimeAsync(1000);
    expect(sockets).toHaveLength(2);
  });

  it("starts the backoff over after a successful open", async () => {
    const { sockets } = setup();
    await settle();

    sockets[0].closeWith(1006);
    await vi.advanceTimersByTimeAsync(1000);
    sockets[1].closeWith(1006);
    await vi.advanceTimersByTimeAsync(2000);
    expect(sockets).toHaveLength(3);

    sockets[2].open();
    sockets[2].closeWith(1006);
    await vi.advanceTimersByTimeAsync(1000);
    expect(sockets).toHaveLength(4);
  });

  it.each([4403, 4404, 1001])("does not reconnect after close code %i", async (code) => {
    const { sockets } = setup();
    await settle();

    sockets[0].closeWith(code, "final");
    await vi.advanceTimersByTimeAsync(120_000);
    expect(sockets).toHaveLength(1);
  });
});

describe("stopping", () => {
  it("closes the socket and cancels a pending retry", async () => {
    const { options, sockets, stop } = setup();
    await settle();
    sockets[0].closeWith(1006); // schedules a retry

    stop();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(options.fetchTicket).toHaveBeenCalledTimes(1);

    const second = setup();
    await settle();
    second.stop();
    expect(second.sockets[0].closed).toBe(true);
    expect(second.options.onSocket).toHaveBeenLastCalledWith(null);
  });

  it("does not open a socket when stopped while the ticket is loading", async () => {
    let resolveTicket!: (value: Ticket) => void;
    const fetchTicket = vi.fn(() => new Promise<Ticket>((resolve) => (resolveTicket = resolve)));
    const { sockets, stop } = setup({ fetchTicket });

    stop();
    resolveTicket(ticket);
    await settle();

    expect(sockets).toHaveLength(0);
  });
});
