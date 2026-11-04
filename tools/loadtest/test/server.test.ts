import { afterEach, describe, expect, it } from "vitest";
import { RawClient, startServer } from "./helpers.js";

const open: { stop(): Promise<void> }[] = [];
const clients: RawClient[] = [];
afterEach(async () => {
  clients.splice(0).forEach((c) => c.close());
  await Promise.all(open.splice(0).map((s) => s.stop()));
});

async function setup() {
  const { server, stats } = await startServer();
  open.push(server);
  const client = await RawClient.connect(server.port);
  clients.push(client);
  return { server, stats, client };
}

describe("fake server", () => {
  it("checks the password", async () => {
    const { client } = await setup();
    expect(
      (await client.call("Authenticate", "SuperAdmin", "nope")).fault
        ?.faultString,
    ).toBe("Wrong login/password");
    expect((await client.call("GetPlayerList", 10, 0)).fault).toBeDefined();
    expect((await client.call("Authenticate", "SuperAdmin", "pw")).result).toBe(
      true,
    );
  });

  it("answers unknown methods with a fault and counts them", async () => {
    const { client, stats } = await setup();
    await client.call("Authenticate", "SuperAdmin", "pw");
    const r = await client.call("DoesNotExist", 1);
    expect(r.fault).toEqual({
      faultCode: -1000,
      faultString: "Unknown method",
    });
    expect(stats.unknown.get("DoesNotExist")).toBe(1);
  });

  it("handles system.multicall, including a fault entry", async () => {
    const { client } = await setup();
    await client.call("Authenticate", "SuperAdmin", "pw");
    const r = await client.call("system.multicall", [
      { methodName: "GetVersion", params: [] },
      { methodName: "Nope", params: [] },
      { methodName: "GetMapList", params: [10, 0] },
    ]);
    const res = r.result as any[];
    expect(res).toHaveLength(3);
    expect(res[0][0].Name).toBe("Trackmania");
    expect(res[1]).toMatchObject({
      faultCode: -1000,
      faultString: "Unknown method",
    });
    expect(res[2][0]).toHaveLength(8);
  });

  it("only sends callbacks after they are enabled", async () => {
    const { server, client } = await setup();
    await client.call("Authenticate", "SuperAdmin", "pw");
    server.sim.tick(60_000);
    expect(client.callbacks).toHaveLength(0);
    await client.call("EnableCallbacks", true);
    server.sim.tick(1000);
    // Mode script callbacks additionally need XmlRpc.EnableCallbacks
    expect(
      client.callbacks.some(
        (c) => c.method === "ManiaPlanet.ModeScriptCallbackArray",
      ),
    ).toBe(false);
    await client.call("TriggerModeScriptEventArray", "XmlRpc.EnableCallbacks", [
      "true",
    ]);
    for (let i = 0; i < 100; i++) server.sim.tick(100);
    await client.waitCallback(
      (c) =>
        c.method === "ManiaPlanet.ModeScriptCallbackArray" &&
        (c.params[0] as string) === "Trackmania.Event.WayPoint",
    );
  });

  it("answers script calls with the same responseid", async () => {
    const { client } = await setup();
    await client.call("Authenticate", "SuperAdmin", "pw");
    await client.call("EnableCallbacks", true);
    await client.call("TriggerModeScriptEventArray", "XmlRpc.EnableCallbacks", [
      "true",
    ]);
    expect(
      (
        await client.call(
          "TriggerModeScriptEventArray",
          "Trackmania.GetScores",
          ["tmcp"],
        )
      ).result,
    ).toBe(true);
    const cb = await client.waitCallback(
      (c) => (c.params[0] as string) === "Trackmania.Scores",
    );
    const payload = JSON.parse((cb.params[1] as string[])[0]);
    expect(payload.responseid).toBe("tmcp");
    expect(payload.players).toHaveLength(3);
  });

  it("counts chat and manialinks", async () => {
    const { client, stats } = await setup();
    await client.call("Authenticate", "SuperAdmin", "pw");
    await client.call("ChatSendServerMessage", "hello");
    await client.call("SendDisplayManialinkPage", "<manialink/>", 0, false);
    expect(stats.chatMessages).toBe(1);
    expect(stats.chatBytes).toBe(5);
    expect(stats.manialinkPages).toBe(1);
  });
});
