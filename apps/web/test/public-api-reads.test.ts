import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  call: vi.fn(),
  findMatch: vi.fn(),
  findMatches: vi.fn(),
  countMatches: vi.fn(),
  lrange: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
  getLogger: () => ({ error: vi.fn(), warn: vi.fn() }),
}));
vi.mock("@/lib/sentry/report", () => ({ reportException: vi.fn() }));
vi.mock("@/lib/gbx-service", () => ({
  getGbxClient: () => ({ call: mocks.call }),
}));
vi.mock("@/lib/redis", () => ({
  getKeyJukebox: (id: string) => `jukebox:${id}`,
  getRedisClient: async () => ({ lrange: mocks.lrange }),
}));
vi.mock("@/lib/dbclient", () => ({
  getClient: () => ({
    matches: {
      findFirst: mocks.findMatch,
      findMany: mocks.findMatches,
      count: mocks.countMatches,
    },
  }),
}));

import type { Actor } from "@/lib/actor";
import { apiKeyClaims } from "@/lib/api-keys/authenticate";
import { getMatchAs, getMatchesPageAs } from "@/services/database/matches";
import { getJukeboxAs } from "@/services/gbx/map";
import { getPlayerListAs } from "@/services/gbx/player";

const serverA = { id: "server-a", name: "A", description: "" };
const creator = {
  userId: "user-1",
  login: "creator",
  displayName: "Creator",
  claims: {
    id: "user-1",
    login: "creator",
    displayName: "Creator",
    admin: true,
  },
} as unknown as Actor;
const keyActor: Actor = {
  ...creator,
  claims: apiKeyClaims(creator, { type: "server", serverId: serverA.id }, [
    serverA,
  ]),
  apiKeyId: "key-1",
};

beforeEach(() => {
  mocks.call.mockResolvedValue([]);
  mocks.lrange.mockResolvedValue([]);
  mocks.findMatches.mockResolvedValue([]);
  mocks.countMatches.mockResolvedValue(0);
  mocks.findMatch.mockResolvedValue(null);
});

describe("actor reads with a server key", () => {
  it.each([
    ["players", (serverId: string) => getPlayerListAs(keyActor, serverId)],
    ["jukebox", (serverId: string) => getJukeboxAs(keyActor, serverId)],
    [
      "matches",
      (serverId: string) => getMatchesPageAs(keyActor, serverId, 1, 20),
    ],
    [
      "a match",
      (serverId: string) => getMatchAs(keyActor, serverId, "match-1"),
    ],
  ])("read %s on the key's server only", async (_, read) => {
    await expect(read("server-a")).resolves.toBeDefined();
    await expect(read("server-b")).rejects.toMatchObject({
      name: "Unauthorized",
    });
  });

  it("scopes a match lookup to the server", async () => {
    await getMatchAs(keyActor, "server-a", "match-1");
    expect(mocks.findMatch).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "match-1", serverId: "server-a", deletedAt: null },
      }),
    );
  });

  it("pages matches with a 1-based page", async () => {
    await getMatchesPageAs(keyActor, "server-a", 3, 20);
    expect(mocks.findMatches).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 40, take: 20 }),
    );
  });
});
