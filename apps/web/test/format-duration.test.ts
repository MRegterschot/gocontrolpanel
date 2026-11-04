import { formatDuration } from "@/lib/utils";
import { describe, expect, it } from "vitest";

const s = 1000;
const m = 60 * s;
const h = 60 * m;
const d = 24 * h;

describe("formatDuration", () => {
  it("shows the two largest units", () => {
    expect(formatDuration(12 * s)).toBe("12s");
    expect(formatDuration(4 * m + 12 * s)).toBe("4m 12s");
    expect(formatDuration(2 * h + 5 * m + 30 * s)).toBe("2h 5m");
    expect(formatDuration(3 * d + 4 * h + 59 * m)).toBe("3d 4h");
  });

  it("drops an empty second unit", () => {
    expect(formatDuration(2 * h + 30 * s)).toBe("2h");
    expect(formatDuration(5 * m)).toBe("5m");
  });

  it("clamps negative and sub-second values to 0s", () => {
    expect(formatDuration(-5000)).toBe("0s");
    expect(formatDuration(400)).toBe("0s");
  });
});
