import { describe, expect, it } from "vitest";
import {
  applySeedsOverride,
  availablePositions,
  PickBan,
  type PickBanMap,
  type PickBanSetup,
} from "../../src/core/plugins/builtin/match/pickban";
import { stringToPickAndBan } from "@gcp/shared";

function maps(count: number): PickBanMap[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `Map ${i + 1}`,
    author: "a",
    uid: `uid-${i + 1}`,
    filename: `map${i + 1}.Map.Gbx`,
    index: 0,
    selectedBy: [],
    pickedBy: "",
    bannedBy: "",
  }));
}

function setup(order: string, overrides: Partial<PickBanSetup> = {}, random = () => 0) {
  return new PickBan(
    {
      mode: "player",
      order: stringToPickAndBan(order),
      choosePosition: false,
      players: [
        { login: "p1", seed: 1 },
        { login: "p2", seed: 2 },
      ],
      teams: [],
      maps: maps(5),
      ...overrides,
    },
    (login) => `Nick ${login}`,
    random,
  );
}

describe("order helpers", () => {
  it("replaces seeds by rank for /setseeds", () => {
    const order = stringToPickAndBan("b:1,b:2,p:2,p:1,r");
    expect(applySeedsOverride(order, [2, 1])).toEqual(stringToPickAndBan("b:2,b:1,p:1,p:2,r"));
    expect(applySeedsOverride(order, [])).toBe(order);
  });

  it("numbers one position per pick or random step", () => {
    expect(availablePositions(stringToPickAndBan("b:1,p:1,b:2,p:2,r"))).toEqual([1, 2, 3]);
  });
});

describe("PickBan (player mode)", () => {
  it("walks the order and builds the final map list", () => {
    const pb = setup("b:1,b:2,p:2,p:1,r");
    expect(pb.currentTurn).toMatchObject({ action: "ban", login: "p1", nickName: "Nick p1" });

    expect(pb.select("p2", "uid-1", []).kind).toBe("notYourTurn");
    expect(pb.select("p1", "uid-1", [])).toMatchObject({ kind: "applied" });
    expect(pb.maps[0].bannedBy).toBe("Nick p1");

    pb.advance();
    pb.select("p2", "uid-2", []);
    pb.advance();
    expect(pb.select("p2", "uid-1", []).kind).toBe("mapUnavailable");
    pb.select("p2", "uid-3", []);
    pb.advance();
    pb.select("p1", "uid-4", []);
    pb.advance();

    expect(pb.currentTurn?.action).toBe("random");
    expect(pb.pickRandom()?.uid).toBe("uid-5");
    pb.advance();

    expect(pb.isDone).toBe(true);
    expect(pb.pickedFileNames()).toEqual(["map3.Map.Gbx", "map4.Map.Gbx", "map5.Map.Gbx"]);
    expect(pb.maps.find((m) => m.uid === "uid-5")).toMatchObject({ pickedBy: "random", index: 3 });
  });

  it("rejects unknown maps", () => {
    expect(setup("p:1").select("p1", "nope", []).kind).toBe("mapNotFound");
  });

  it("lets the picker choose a free position", () => {
    const pb = setup("p:1,p:2,r", { choosePosition: true });
    expect(pb.select("p1", "uid-2", []).kind).toBe("choosePosition");
    expect(pb.choosePositionFor(9)).toBeNull();
    expect(pb.choosePositionFor(3)).toMatchObject({ uid: "uid-2", index: 3 });
    expect(pb.positionsAvailable).toEqual([1, 2]);

    pb.advance();
    pb.select("p2", "uid-4", []);
    pb.choosePositionFor(1);
    pb.advance();
    pb.pickRandom();

    expect(pb.pickedFileNames()).toEqual(["map4.Map.Gbx", expect.any(String), "map2.Map.Gbx"]);
  });

  it("resolves a timed-out ban as a ban and a timed-out pick as a pick", () => {
    const pb = setup("b:1,p:2");
    expect(pb.resolveTimeout()).toMatchObject({ bannedBy: "Nick p1" });
    pb.advance();
    expect(pb.resolveTimeout()).toMatchObject({ pickedBy: "Nick p2", index: 1 });
  });

  it("falls back to the login when the player is not online", () => {
    const pb = new PickBan(
      {
        mode: "player",
        order: stringToPickAndBan("p:1"),
        choosePosition: false,
        players: [{ login: "away", seed: 1 }],
        teams: [],
        maps: maps(2),
      },
      () => undefined,
    );
    expect(pb.currentTurn?.nickName).toBe("away");
  });
});

describe("PickBan (team mode)", () => {
  const teamSetup = () =>
    setup("p:1,b:2", {
      mode: "team",
      teams: [
        { seed: 1, name: "Red", players: ["r1", "r2", "r3"] },
        { seed: 2, players: ["b1"] },
      ],
    });

  it("needs a majority of the online team to agree", () => {
    const pb = teamSetup();
    const online = ["r1", "r2", "r3"];

    expect(pb.select("b1", "uid-1", online).kind).toBe("notYourTurn");
    expect(pb.select("r1", "uid-1", online).kind).toBe("voteRegistered");
    expect(pb.select("r2", "uid-2", online).kind).toBe("voteRegistered");
    // r2 moves their vote; two of three now agree
    expect(pb.select("r2", "uid-1", online)).toMatchObject({ kind: "applied" });
    expect(pb.maps[0]).toMatchObject({ pickedBy: "Red", index: 1 });
    expect(pb.maps[1].selectedBy).toEqual([]);

    pb.advance();
    expect(pb.currentTurn?.nickName).toBe("Team 2");
  });
});
