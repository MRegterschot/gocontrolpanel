import { describe, expect, it } from "vitest";
import { callEach, MAX_CALLS_PER_MULTICALL } from "../src/lib/gbx-batch";

type Call = [string, ...unknown[]];

// Answers every call with its first argument, or undefined (a fault) for the ones in `faults`
function fakeClient(faults: string[] = []) {
  const batches: Call[][] = [];
  return {
    batches,
    multicall: async (calls: Call[]) => {
      batches.push(calls);
      return calls.map(([, arg]) => (faults.includes(arg as string) ? undefined : { id: arg }));
    },
  } as any;
}

const args = (n: number) => Array.from({ length: n }, (_, i) => [`p${i}`]);

describe("callEach", () => {
  it("returns nothing and makes no request for an empty list", async () => {
    const client = fakeClient();
    expect(await callEach(client, "GetPlayerInfo", [])).toEqual([]);
    expect(client.batches).toHaveLength(0);
  });

  it("answers a list in one round trip, in order, with the method in front of each call", async () => {
    const client = fakeClient();
    const out = await callEach(client, "GetPlayerInfo", args(3));

    expect(out).toEqual([{ id: "p0" }, { id: "p1" }, { id: "p2" }]);
    expect(client.batches).toEqual([[["GetPlayerInfo", "p0"], ["GetPlayerInfo", "p1"], ["GetPlayerInfo", "p2"]]]);
  });

  it("gives null for an entry the dedicated server rejected and keeps the others", async () => {
    const out = await callEach(fakeClient(["p1"]), "GetPlayerInfo", args(3));
    expect(out).toEqual([{ id: "p0" }, null, { id: "p2" }]);
  });

  it("splits at the service limit and keeps the order across batches", async () => {
    const client = fakeClient();
    const out = await callEach(client, "GetMapInfo", args(MAX_CALLS_PER_MULTICALL * 2 + 1));

    expect(client.batches.map((b: Call[]) => b.length)).toEqual([100, 100, 1]);
    expect(out).toHaveLength(201);
    expect(out[100]).toEqual({ id: "p100" });
    expect(out[200]).toEqual({ id: "p200" });
  });

  it("fails when the answer does not match the calls instead of showing unknowns", async () => {
    const client = { multicall: async () => [] } as any;
    await expect(callEach(client, "GetPlayerInfo", args(2))).rejects.toThrow("returned 0 results for 2 calls");
  });

  it("lets a failing request through", async () => {
    const client = { multicall: async () => { throw new Error("GBX service is unavailable"); } } as any;
    await expect(callEach(client, "GetPlayerInfo", args(1))).rejects.toThrow("unavailable");
  });
});
