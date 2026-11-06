import net from "node:net";
import { Readable } from "node:stream";
import Deserializer from "xmlrpc/lib/deserializer.js";
import { FakeServer } from "../src/fake-server.js";
import { ServerStats } from "../src/stats.js";
import { FrameParser, REQUEST_BIT, encodeFrame } from "../src/wire.js";
import { methodCall, parseMethodCall } from "../src/xml.js";

export async function startServer(
  over: Partial<ConstructorParameters<typeof FakeServer>[0]> = {},
) {
  const stats = new ServerStats();
  const server = new FakeServer({
    index: 0,
    port: 0,
    host: "127.0.0.1",
    password: "pw",
    user: "SuperAdmin",
    players: 3,
    eventRate: 5,
    chatRate: 0,
    mapMinutes: 1,
    seed: 1,
    stats,
    tickMs: 0,
    ...over,
  });
  await server.start();
  return { server, stats };
}

export interface Reply {
  result?: unknown;
  fault?: { faultCode: number; faultString: string };
}

// Minimal raw GBXRemote client for tests
export class RawClient {
  private parser = new FrameParser(true);
  private handle = REQUEST_BIT;
  private waiting = new Map<number, (r: Reply) => void>();
  callbacks: { method: string; params: unknown[] }[] = [];
  private onCallback?: () => void;
  private ready!: Promise<void>;
  socket!: net.Socket;

  static async connect(port: number): Promise<RawClient> {
    const c = new RawClient();
    c.socket = net.connect(port, "127.0.0.1");
    c.ready = new Promise((resolve) => {
      c.socket.on("data", (chunk) => {
        for (const f of c.parser.push(chunk)) c.onFrame(f.handle, f.xml);
        if (c.parser.handshake) resolve();
      });
    });
    await c.ready;
    return c;
  }

  private onFrame(handle: number, xml: string) {
    if (handle >= REQUEST_BIT) {
      new Deserializer("utf-8").deserializeMethodResponse(
        Readable.from([Buffer.from(xml)]),
        (err, result) => {
          const e = err as
            | (Error & { faultCode?: number; faultString?: string })
            | null;
          this.waiting.get(handle)?.(
            e
              ? {
                  fault: {
                    faultCode: e.faultCode!,
                    faultString: e.faultString!,
                  },
                }
              : { result },
          );
          this.waiting.delete(handle);
        },
      );
    } else {
      void parseMethodCall(xml).then((c) => {
        this.callbacks.push(c);
        this.onCallback?.();
      });
    }
  }

  call(method: string, ...params: unknown[]): Promise<Reply> {
    const h = ++this.handle;
    return new Promise((resolve) => {
      this.waiting.set(h, resolve);
      this.socket.write(encodeFrame(h, methodCall(method, params)));
    });
  }

  async waitCallback(
    pred: (c: { method: string; params: unknown[] }) => boolean,
    ms = 2000,
  ) {
    const deadline = Date.now() + ms;
    for (;;) {
      const hit = this.callbacks.find(pred);
      if (hit) return hit;
      if (Date.now() > deadline)
        throw new Error("timed out waiting for callback");
      await new Promise<void>((r) => {
        this.onCallback = r;
        setTimeout(r, 50);
      });
    }
  }

  close() {
    this.socket.destroy();
  }
}
