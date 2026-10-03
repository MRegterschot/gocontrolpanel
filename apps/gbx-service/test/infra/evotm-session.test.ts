import { createServer, type Server, type Socket } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { EvotmGbxSession } from "../../src/infra/gbx/evotm-session";
import { silentLogger } from "../fakes/logger";

// Minimal GBXRemote 2 server: length-prefixed XML-RPC frames with request handles
function value(v: unknown): string {
  if (typeof v === "string") return `<value><string>${v}</string></value>`;
  if (typeof v === "boolean") return `<value><boolean>${v ? 1 : 0}</boolean></value>`;
  if (typeof v === "number") return `<value><int>${v}</int></value>`;
  if (Array.isArray(v)) return `<value><array><data>${v.map(value).join("")}</data></array></value>`;
  const members = Object.entries(v as object)
    .map(([k, val]) => `<member><name>${k}</name>${value(val)}</member>`)
    .join("");
  return `<value><struct>${members}</struct></value>`;
}

function frame(handle: number, xml: string): Buffer {
  const body = Buffer.from(xml, "utf8");
  const header = Buffer.alloc(8);
  header.writeUInt32LE(body.length, 0);
  header.writeUInt32LE(handle, 4);
  return Buffer.concat([header, body]);
}

class FakeGbxServer {
  readonly requests: string[] = [];
  private server: Server;
  private sockets: Socket[] = [];

  constructor(private readonly respond: (method: string, xml: string) => unknown) {
    this.server = createServer((socket) => {
      this.sockets.push(socket);
      const hello = Buffer.from("GBXRemote 2");
      const len = Buffer.alloc(4);
      len.writeUInt32LE(hello.length);
      socket.write(Buffer.concat([len, hello]));

      let buffer = Buffer.alloc(0);
      socket.on("data", (data) => {
        buffer = Buffer.concat([buffer, data]);
        while (buffer.length >= 8) {
          const size = buffer.readUInt32LE(0);
          if (buffer.length < 8 + size) break;
          const handle = buffer.readUInt32LE(4);
          const xml = buffer.subarray(8, 8 + size).toString("utf8");
          buffer = buffer.subarray(8 + size);
          const method = /<methodName>([^<]+)<\/methodName>/.exec(xml)?.[1] ?? "";
          this.requests.push(method);
          const result = this.respond(method, xml);
          socket.write(
            frame(handle, `<?xml version="1.0"?><methodResponse><params><param>${value(result)}</param></params></methodResponse>`),
          );
        }
      });
    });
  }

  listen(): Promise<number> {
    return new Promise((resolve) =>
      this.server.listen(0, "127.0.0.1", () => resolve((this.server.address() as { port: number }).port)),
    );
  }

  callback(method: string, params: unknown[]) {
    const xml = `<?xml version="1.0"?><methodCall><methodName>${method}</methodName><params>${params
      .map((p) => `<param>${value(p)}</param>`)
      .join("")}</params></methodCall>`;
    this.sockets.forEach((socket) => socket.write(frame(1, xml)));
  }

  dropClients() {
    this.sockets.forEach((socket) => socket.destroy());
  }

  close(): Promise<void> {
    this.dropClients();
    return new Promise((resolve) => this.server.close(() => resolve()));
  }
}

const servers: FakeGbxServer[] = [];
const sessions: EvotmGbxSession[] = [];
afterEach(async () => {
  await Promise.all(sessions.splice(0).map((s) => s.disconnect()));
  await Promise.all(servers.splice(0).map((s) => s.close()));
});

async function start(respond: (method: string, xml: string) => unknown = () => true) {
  const server = new FakeGbxServer(respond);
  servers.push(server);
  const port = await server.listen();
  const session = new EvotmGbxSession(silentLogger);
  sessions.push(session);
  return { server, port, session };
}

describe("EvotmGbxSession against a GBXRemote 2 server", () => {
  it("connects, calls and receives callbacks", async () => {
    const { server, port, session } = await start((method) =>
      method === "GetServerName" ? "My Server" : { Login: "srv", PlayerId: 0 },
    );
    await session.connect("127.0.0.1", port, 2000);

    expect(await session.call("GetServerName")).toBe("My Server");

    const received = new Promise<[string, unknown]>((resolve) =>
      session.onCallback((method, data) => resolve([method, data])),
    );
    server.callback("ManiaPlanet.PlayerConnect", ["abc", false]);
    expect(await received).toEqual(["ManiaPlanet.PlayerConnect", ["abc", false]]);
  });

  it("sends multicalls without mutating the caller's arrays", async () => {
    const { port, session } = await start((method, xml) => {
      expect(method).toBe("system.multicall");
      const count = (xml.match(/<name>methodName<\/name>/g) ?? []).length;
      return Array.from({ length: count }, (_, i) => [`result-${i}`]);
    });
    await session.connect("127.0.0.1", port, 2000);

    const calls: [string, ...unknown[]][] = [["GetServerName"], ["GetServerComment"]];
    expect(await session.multicall(calls)).toEqual(["result-0", "result-1"]);
    expect(calls).toEqual([["GetServerName"], ["GetServerComment"]]);
  });

  it("returns undefined for a call that faulted inside a multicall and keeps the others", async () => {
    const { port, session } = await start(() => [
      [{ Login: "online" }],
      { faultCode: -1000, faultString: "Login unknown." },
      [7],
    ]);
    await session.connect("127.0.0.1", port, 2000);

    const out = await session.multicall([["GetPlayerInfo", "online"], ["GetPlayerInfo", "gone"], ["Other"]]);

    expect(out).toEqual([{ Login: "online" }, undefined, 7]);
  });

  it("reports a dropped connection", async () => {
    const { server, port, session } = await start();
    await session.connect("127.0.0.1", port, 2000);
    const dropped = new Promise<boolean>((resolve) => session.onDisconnect(() => resolve(true)));
    server.dropClients();
    expect(await dropped).toBe(true);
  });

  it("rejects instead of crashing when nothing listens on the port", async () => {
    const { port, server } = await start();
    await server.close();
    servers.length = 0;

    const session = new EvotmGbxSession(silentLogger);
    sessions.push(session);
    await expect(session.connect("127.0.0.1", port, 500)).rejects.toThrow();
  });
});
