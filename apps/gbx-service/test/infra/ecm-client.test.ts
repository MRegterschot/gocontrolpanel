import { describe, expect, it, vi } from "vitest";
import { HttpEcmClient } from "../../src/infra/ecm/ecm-client";
import { silentLogger } from "../fakes/logger";

describe("HttpEcmClient", () => {
  it("posts to the match endpoint with the token from the api key", async () => {
    const fetch = vi.fn(async () => new Response("ok"));
    const client = new HttpEcmClient(silentLogger, "https://ecm.test", fetch as never);

    await client.driverFinish("match1_token1", { finishTime: 1, ubisoftUid: "u", roundNum: 1, mapId: "m" });

    expect(fetch).toHaveBeenCalledWith("https://ecm.test/match-addRoundTime?matchId=match1", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "token1" },
      body: JSON.stringify({ finishTime: 1, ubisoftUid: "u", roundNum: 1, mapId: "m" }),
    });
  });

  it("skips invalid keys and swallows network errors", async () => {
    const fetch = vi.fn(async () => {
      throw new Error("offline");
    });
    const client = new HttpEcmClient(silentLogger, "https://ecm.test", fetch as never);

    await client.roundEnd("invalid", { players: [], roundNum: 1, mapId: "m" });
    expect(fetch).not.toHaveBeenCalled();
    await expect(client.roundEnd("a_b", { players: [], roundNum: 1, mapId: "m" })).resolves.toBeUndefined();
  });
});
