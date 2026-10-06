import type { DbClient } from "@gcp/db";
import { describe, expect, it, vi } from "vitest";
import { PrismaSystemCommandServices } from "../../src/infra/db/system-command-services";

describe("Redis diagnostics", () => {
  it("checks the live connection with PING", async () => {
    const redis = { status: "ready" as const, ping: vi.fn(async () => "PONG" as const) };
    await expect(
      new PrismaSystemCommandServices({} as DbClient, redis).checkRedis(),
    ).resolves.toBeUndefined();
    expect(redis.ping).toHaveBeenCalledOnce();
  });
  it("does not queue a diagnostic when Redis is disconnected", async () => {
    const redis = {
      status: "reconnecting" as const,
      ping: vi.fn(async () => "PONG" as const),
    };
    await expect(
      new PrismaSystemCommandServices({} as DbClient, redis).checkRedis(),
    ).rejects.toThrow("Redis is not ready");
    expect(redis.ping).not.toHaveBeenCalled();
  });
});
