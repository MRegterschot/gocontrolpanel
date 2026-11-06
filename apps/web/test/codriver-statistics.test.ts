import { usageAccumulator, type UsageRecord } from "@/lib/codriver/statistics";
import { describe, expect, it } from "vitest";

const now = new Date("2026-10-08T12:00:00Z");
const row = (overrides: Partial<UsageRecord> = {}): UsageRecord => ({
  serverId: "s1",
  createdAt: new Date("2026-10-02T12:00:00Z"),
  status: "done",
  keySource: "shared",
  model: "model",
  modelCalls: 1,
  costMicros: 100,
  toolCalls: [{ tool: "skip_map" }],
  ...overrides,
});

describe("Codriver usage aggregation", () => {
  it("counts requests, not repeated tools, and treats missing tracking as unknown", () => {
    const accumulator = usageAccumulator(now, [
      {
        id: "s1",
        name: "One",
        groups: [
          { id: "g1", name: "Group" },
          { id: "g2", name: "Other" },
        ],
      },
    ]);
    accumulator.add([
      row({ toolCalls: [{ tool: "skip_map" }, { tool: "skip_map" }] }),
      row({ modelCalls: 2, status: "failed", costMicros: 250 }),
    ]);
    accumulator.add([
      row({ modelCalls: null }),
      row({
        keySource: "none",
        model: null,
        modelCalls: 0,
        costMicros: 0,
        toolCalls: null,
      }),
    ]);
    const result = accumulator.result();
    expect(result).toMatchObject({
      requests: 4,
      costMicros: 450,
      failed: 1,
      modelRequests: 2,
      escalated: 1,
      untrackedModelRequests: 1,
    });
    expect(result.tools).toEqual([{ name: "skip_map", requests: 3 }]);
    expect(result.byGroup.map((group) => group.costMicros)).toEqual([450, 450]);
    expect(result.byKey.find((key) => key.id === "none")).toMatchObject({
      requests: 1,
      costMicros: 0,
    });
    expect(result.daily).toHaveLength(8);
    expect(result.daily[0].requests).toBe(0);
    expect(result.daily[1].requests).toBe(4);
  });
  it("excludes previous months and future records with UTC boundaries", () => {
    const accumulator = usageAccumulator(now, []);
    accumulator.add([
      row({ createdAt: new Date("2026-09-30T23:59:59Z") }),
      row({ createdAt: new Date("2026-10-08T12:00:01Z") }),
      row({ createdAt: new Date("2026-10-01T00:00:00Z") }),
    ]);
    expect(accumulator.result().requests).toBe(1);
    expect(accumulator.result().daily[0].requests).toBe(1);
  });
});
