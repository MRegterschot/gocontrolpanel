import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUsers: vi.fn(),
  createMany: vi.fn(),
  set: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({ getLogger: () => ({ error: vi.fn() }) }));
vi.mock("@/lib/redis", () => ({
  getRedisClient: async () => ({ set: mocks.set }),
}));
vi.mock("@/lib/dbclient", () => ({
  getClient: () => ({
    users: { findMany: mocks.findUsers },
    notifications: { createMany: mocks.createMany },
    servers: { findUnique: async () => ({ name: "Cup Server" }) },
  }),
}));

import {
  notifyBudgetCrossings,
  notifyKeyRejected,
} from "@/lib/codriver/alerts";

const budget = (scope: "server-key" | "shared-server" | "shared-global") => ({
  scope,
  limitCents: 100, // $1, 1,000,000 micros
});

const messages = () =>
  mocks.createMany.mock.calls.map((call) => call[0].data[0].message as string);

beforeEach(() => {
  mocks.findUsers.mockResolvedValue([{ id: "admin-1" }, { id: "admin-2" }]);
});

describe("notifyBudgetCrossings", () => {
  it("notifies every recipient once when 80% is crossed", async () => {
    await notifyBudgetCrossings(
      "s",
      [{ budget: budget("server-key"), spentMicros: 790_000 }],
      20_000,
    );
    expect(messages()).toEqual([
      "Codriver used 80% of its monthly budget for the API key of Cup Server",
    ]);
    expect(mocks.createMany.mock.calls[0][0].data).toHaveLength(2);
  });

  it("reports only the highest threshold crossed", async () => {
    await notifyBudgetCrossings(
      "s",
      [{ budget: budget("shared-global"), spentMicros: 700_000 }],
      400_000,
    );
    expect(messages()).toEqual([
      "Codriver reached its monthly budget for the panel's shared key",
    ]);
  });

  it("stays quiet without a crossing or a cost", async () => {
    await notifyBudgetCrossings(
      "s",
      [{ budget: budget("shared-server"), spentMicros: 810_000 }],
      10_000,
    );
    await notifyBudgetCrossings(
      "s",
      [{ budget: budget("shared-server"), spentMicros: 790_000 }],
      0,
    );
    expect(mocks.createMany).not.toHaveBeenCalled();
  });

  it("sends shared-global alerts to panel admins only", async () => {
    await notifyBudgetCrossings(
      "s",
      [{ budget: budget("shared-global"), spentMicros: 0 }],
      900_000,
    );
    expect(mocks.findUsers.mock.calls[0][0].where.OR).toEqual([
      { admin: true },
    ]);
  });
});

describe("notifyKeyRejected", () => {
  it("notifies at most once an hour per key", async () => {
    mocks.set.mockResolvedValueOnce("OK").mockResolvedValueOnce(null);
    await notifyKeyRejected("s", "server");
    await notifyKeyRejected("s", "server");
    expect(mocks.createMany).toHaveBeenCalledTimes(1);
    expect(mocks.set).toHaveBeenCalledWith(
      "codriver:key-alert:s",
      "1",
      "EX",
      3600,
      "NX",
    );
  });

  it("tells only panel admins about the shared key", async () => {
    mocks.set.mockResolvedValue("OK");
    await notifyKeyRejected("s", "shared");
    expect(mocks.findUsers.mock.calls[0][0].where.OR).toEqual([
      { admin: true },
    ]);
  });
});
