import type { DbClient } from "@tmcontrolpanel/db";
import { describe, expect, it, vi } from "vitest";
import type { Logger } from "../../src/core/logger";
import { waitForSchema } from "../../src/infra/db/schema";

const missingTable = () =>
  Object.assign(new Error("no table"), { code: "P2021" });

function setup() {
  const count = vi.fn();
  const warn = vi.fn();
  const db = { plugins: { count } } as unknown as DbClient;
  const log = { warn } as unknown as Logger;
  return { count, warn, db, log };
}

describe("waitForSchema", () => {
  it("returns on the first successful query without warning", async () => {
    const { count, warn, db, log } = setup();
    count.mockResolvedValue(0);
    await waitForSchema(db, log, 1_000, 1);
    expect(count).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it("retries on P2021 and warns once", async () => {
    const { count, warn, db, log } = setup();
    count
      .mockRejectedValueOnce(missingTable())
      .mockRejectedValueOnce(missingTable())
      .mockResolvedValue(0);
    await waitForSchema(db, log, 5_000, 1);
    expect(count).toHaveBeenCalledTimes(3);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("rethrows other errors without retrying", async () => {
    const { count, db, log } = setup();
    const boom = new Error("boom");
    count.mockRejectedValue(boom);
    await expect(waitForSchema(db, log, 5_000, 1)).rejects.toBe(boom);
    expect(count).toHaveBeenCalledTimes(1);
  });

  it("rethrows P2021 once the deadline has passed", async () => {
    const { count, db, log } = setup();
    count.mockRejectedValue(missingTable());
    await expect(waitForSchema(db, log, 0, 1)).rejects.toMatchObject({
      code: "P2021",
    });
  });
});
