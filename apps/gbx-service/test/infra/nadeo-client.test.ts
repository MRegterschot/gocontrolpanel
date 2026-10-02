import { describe, expect, it, vi } from "vitest";
import { NadeoClient, type NadeoClientDeps } from "../../src/infra/nadeo/nadeo-client";
import type { KeyValueCache } from "../../src/infra/redis/cache";
import { silentLogger } from "../fakes/logger";

class MemoryCache implements KeyValueCache {
  readonly values = new Map<string, string>();
  async get(key: string) {
    return this.values.get(key) ?? null;
  }
  async set(key: string, value: string) {
    this.values.set(key, value);
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function setup(route: (url: string, init?: RequestInit) => Response) {
  const cache = new MemoryCache();
  const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => route(String(input), init));
  const rateLimit = vi.fn((_key: string, fn: () => Promise<unknown>) => fn());
  const client = new NadeoClient({
    config: { serverLogin: "srv", serverPassword: "pw", contact: "tests", clientId: "id", clientSecret: "secret" },
    cache,
    rateLimit: rateLimit as NadeoClientDeps["rateLimit"],
    log: silentLogger,
    fetch: fetch as unknown as typeof globalThis.fetch,
  });
  return { client, cache, fetch, rateLimit };
}

const mapInfo = { mapId: "map-id", mapUid: "uid", submitter: "s", timestamp: "2024-01-01T00:00:00Z", fileUrl: "f", thumbnailUrl: "t" };

describe("NadeoClient", () => {
  it("authenticates once and reuses the cached token", async () => {
    const { client, fetch, cache } = setup((url) => {
      if (url.includes("/authentication/token/basic")) return json({ accessToken: "tok", refreshToken: "r" });
      return json([mapInfo]);
    });

    await client.getMapsMetadata(["uid"]);
    await client.getMapsMetadata(["uid"]);

    const authCalls = fetch.mock.calls.filter(([url]) => String(url).includes("authentication"));
    expect(authCalls).toHaveLength(1);
    expect(JSON.parse(cache.values.get("nadeo:tokens:NadeoServices")!).accessToken).toBe("tok");
    const [, init] = fetch.mock.calls.at(-1)!;
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "nadeo_v1 t=tok", "User-Agent": "tests" });
  });

  it("re-authenticates and retries once on 401", async () => {
    let tokens = 0;
    const { client, cache } = setup((url, init) => {
      if (url.includes("authentication")) return json({ accessToken: `tok${++tokens}`, refreshToken: "r" });
      const auth = (init?.headers as Record<string, string>).Authorization;
      return auth === "nadeo_v1 t=stale" ? json({}, 401) : json([mapInfo]);
    });
    cache.values.set("nadeo:tokens:NadeoServices", JSON.stringify({ accessToken: "stale" }));

    const result = await client.getMapsMetadata(["uid"]);
    expect(result.get("uid")?.thumbnailUrl).toBe("t");
    expect(tokens).toBe(1);
  });

  it("maps metadata, world records and personal bests", async () => {
    const { client } = setup((url) => {
      if (url.includes("authentication")) return json({ accessToken: "tok", refreshToken: "r" });
      if (url.includes("/leaderboard/")) return json({ tops: [{ top: [{ accountId: "wr", score: 1234 }] }] });
      if (url.includes("/mapRecords/")) {
        expect(url).toContain("mapId=map-id");
        return json([{ accountId: "a", recordScore: { time: 999 } }]);
      }
      return json([mapInfo]);
    });

    expect((await client.getMapsMetadata(["uid"])).get("uid")?.timestamp).toEqual(new Date("2024-01-01T00:00:00Z"));
    expect(await client.getWorldRecord("uid")).toEqual({ accountId: "wr", score: 1234 });
    expect(await client.getPersonalBests("uid", ["a"])).toEqual(new Map([["a", 999]]));
    expect(await client.getPersonalBests("uid", [])).toEqual(new Map());
  });

  it("returns null when a map has no world record", async () => {
    const { client } = setup((url) =>
      url.includes("authentication") ? json({ accessToken: "t", refreshToken: "r" }) : json({ tops: [{ top: [] }] }),
    );
    expect(await client.getWorldRecord("uid")).toBeNull();
  });

  it("caches account names and only asks for missing ones", async () => {
    const { client, fetch, cache } = setup((url) => {
      if (url.includes("access_token")) return json({ access_token: "cred", expires_in: 3600 });
      return json({ b: "Bee" });
    });
    cache.values.set("nadeo:account-names", JSON.stringify({ a: "Ay" }));

    expect(await client.getAccountNames(["a", "b"])).toEqual({ a: "Ay", b: "Bee" });
    const nameCall = fetch.mock.calls.find(([url]) => String(url).includes("display-names"))!;
    expect(String(nameCall[0])).toContain("accountId%5B%5D=b");
    expect(String(nameCall[0])).not.toContain("=a");
    expect(JSON.parse(cache.values.get("nadeo:account-names")!)).toEqual({ a: "Ay", b: "Bee" });

    fetch.mockClear();
    await client.getAccountNames(["a", "b"]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("deduplicates concurrent authentication", async () => {
    const { client, fetch } = setup((url) =>
      url.includes("authentication") ? json({ accessToken: "tok", refreshToken: "r" }) : json([mapInfo]),
    );
    await Promise.all([client.getMapsMetadata(["uid"]), client.getMapsMetadata(["uid"])]);
    expect(fetch.mock.calls.filter(([url]) => String(url).includes("authentication"))).toHaveLength(1);
  });

  it("surfaces upstream failures as typed errors and routes through the rate limiter", async () => {
    const { client, rateLimit } = setup((url) =>
      url.includes("authentication") ? json({ accessToken: "tok", refreshToken: "r" }) : json({}, 500),
    );
    await expect(client.getWorldRecord("uid")).rejects.toMatchObject({ code: "UpstreamError" });
    expect(rateLimit).toHaveBeenCalledWith("nadeo:doRequest", expect.any(Function));
  });
});
