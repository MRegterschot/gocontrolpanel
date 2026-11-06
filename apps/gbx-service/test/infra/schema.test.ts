import type { DbClient } from "@tmcontrolpanel/db";
import { describe, expect, it, vi } from "vitest";
import type { Logger } from "../../src/core/logger";
import { waitForSchema } from "../../src/infra/db/schema";

const missingTable = () =>
  Object.assign(new Error("no table"), { code: "P2021" });
const missingRawTable = (code: string) =>
  Object.assign(new Error("raw failed"), { code: "P2010", meta: { code } });

function setup() {
  const count = vi.fn();
  const queryRaw = vi.fn();
  const warn = vi.fn();
  const db = { plugins: { count }, $queryRaw: queryRaw } as unknown as DbClient;
  const log = { warn } as unknown as Logger;
  return { count, queryRaw, warn, db, log };
}

describe("waitForSchema without a known migration", () => {
  it("returns on the first successful query without warning", async () => {
    const { count, warn, db, log } = setup();
    count.mockResolvedValue(0);
    await waitForSchema(db, log, 1_000, 1, undefined);
    expect(count).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it("retries on P2021 and warns once", async () => {
    const { count, warn, db, log } = setup();
    count
      .mockRejectedValueOnce(missingTable())
      .mockRejectedValueOnce(missingTable())
      .mockResolvedValue(0);
    await waitForSchema(db, log, 5_000, 1, undefined);
    expect(count).toHaveBeenCalledTimes(3);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("rethrows other errors without retrying", async () => {
    const { count, db, log } = setup();
    const boom = new Error("boom");
    count.mockRejectedValue(boom);
    await expect(waitForSchema(db, log, 5_000, 1, undefined)).rejects.toBe(
      boom,
    );
    expect(count).toHaveBeenCalledTimes(1);
  });

  it("gives up once the deadline has passed", async () => {
    const { count, db, log } = setup();
    count.mockRejectedValue(missingTable());
    await expect(waitForSchema(db, log, 0, 1, undefined)).rejects.toThrow(
      /not ready/,
    );
  });
});

describe("waitForSchema with the build's latest migration", () => {
  const latest = "20261021130000_audit_api_key";

  it("returns once the migration is recorded as finished", async () => {
    const { count, queryRaw, warn, db, log } = setup();
    queryRaw.mockResolvedValue([{ n: 1n }]);
    await waitForSchema(db, log, 1_000, 1, latest);
    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(count).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it("waits while earlier tables exist but the migration is still pending", async () => {
    const { queryRaw, warn, db, log } = setup();
    queryRaw
      .mockResolvedValueOnce([{ n: 0n }])
      .mockResolvedValueOnce([{ n: 0 }])
      .mockResolvedValue([{ n: 1 }]);
    await waitForSchema(db, log, 5_000, 1, latest);
    expect(queryRaw).toHaveBeenCalledTimes(3);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it.each(["1146", "42P01"])(
    "retries while the migrations table is missing (%s)",
    async (code) => {
      const { queryRaw, db, log } = setup();
      queryRaw
        .mockRejectedValueOnce(missingRawTable(code))
        .mockResolvedValue([{ n: 1 }]);
      await waitForSchema(db, log, 5_000, 1, latest);
      expect(queryRaw).toHaveBeenCalledTimes(2);
    },
  );

  it("rethrows other raw query failures", async () => {
    const { queryRaw, db, log } = setup();
    const denied = missingRawTable("1045");
    queryRaw.mockRejectedValue(denied);
    await expect(waitForSchema(db, log, 5_000, 1, latest)).rejects.toBe(denied);
  });

  it("names the migration when it gives up", async () => {
    const { queryRaw, db, log } = setup();
    queryRaw.mockResolvedValue([{ n: 0 }]);
    await expect(waitForSchema(db, log, 0, 1, latest)).rejects.toThrow(latest);
  });
});
