import { verifyWsTicket } from "@tmcontrolpanel/shared";
import { afterEach, describe, expect, it } from "vitest";
import { WebSocketServer } from "ws";
import { runBrowsers, type BrowsersConfig } from "../src/browsers.js";

const SECRET = "x".repeat(40);
let wss: WebSocketServer | undefined;
afterEach(() => new Promise<void>((r) => (wss ? wss.close(() => r()) : r())));

describe("browsers", () => {
  it("connects with single-use tickets and counts messages", async () => {
    const paths: string[] = [];
    const used = new Set<string>();
    let reused = 0;
    wss = new WebSocketServer({ port: 0 });
    wss.on("connection", async (ws, req) => {
      const url = new URL(req.url!, "http://x");
      const ticket = url.searchParams.get("ticket")!;
      const v = await verifyWsTicket(ticket, SECRET);
      if (used.has(v.ticketId)) reused++;
      used.add(v.ticketId);
      paths.push(url.pathname);
      ws.send(JSON.stringify({ type: "beginMatch", data: {} }));
      if (url.pathname === "/ws/players/s2") ws.close(4403, "no");
    });
    const port = (wss.address() as { port: number }).port;
    const cfg: BrowsersConfig = {
      browsers: 2,
      url: `ws://127.0.0.1:${port}`,
      secret: SECRET,
      claims: {
        id: "u",
        login: "",
        displayName: "",
        admin: true,
        permissions: [],
        servers: [],
        groups: [],
        adminGroups: [],
      } as any,
      serverIds: ["s1", "s2"],
      channels: ["servers", "live", "players"],
      ramp: 0,
      duration: 1,
      httpPaths: [],
      httpRps: 0,
    };
    const out: string[] = [];
    const summary: any = await runBrowsers(
      cfg,
      new Promise(() => undefined),
      (l) => out.push(l),
    );
    expect(paths.sort()).toEqual(
      [
        "/ws/live/s1",
        "/ws/live/s2",
        "/ws/players/s1",
        "/ws/players/s2",
        "/ws/servers",
        "/ws/servers",
      ].sort(),
    );
    expect(reused).toBe(0);
    expect(summary.messages).toBe(6);
    expect(summary.closeCodes["4403"]).toBe(1);
    expect(summary.reconnects).toBe(0);
  });
});
