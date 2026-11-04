import { GET } from "@/app/api/health/route";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  database: vi.fn(),
  redis: vi.fn(),
  warn: vi.fn(),
}));
vi.mock("@/lib/dbclient", () => ({
  getClient: () => ({ $queryRaw: mocks.database }),
}));
vi.mock("@/lib/redis", () => ({
  getRedisClient: async () => ({ ping: mocks.redis }),
}));
vi.mock("@/lib/config", () => ({
  default: { GBX_SERVICE: { URL: "http://service" } },
}));
vi.mock("@/lib/logger", () => ({ logger: { warn: mocks.warn } }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.database.mockResolvedValue([{ value: 1 }]);
  mocks.redis.mockResolvedValue("PONG");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(null, { status: 200 })),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("returns an uncacheable healthy response", async () => {
  const response = await GET();
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({
    status: "ok",
    checks: { database: "ok", redis: "ok", gbx: "ok" },
  });
  expect(mocks.warn).not.toHaveBeenCalled();
});

it.each(["database", "redis", "gbx"] as const)(
  "isolates a %s failure",
  async (name) => {
    if (name === "gbx")
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 503 }));
    else mocks[name].mockRejectedValue(new Error("private connection details"));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      status: "unavailable",
      checks: { database: "ok", redis: "ok", gbx: "ok", [name]: "fail" },
    });
    expect(mocks.warn).toHaveBeenCalledExactlyOnceWith(
      { check: name },
      "Health check failed",
    );
  },
);

it("bounds a hanging check to two seconds", async () => {
  vi.useFakeTimers();
  mocks.database.mockImplementation(() => new Promise(() => {}));
  const pending = GET();
  await vi.advanceTimersByTimeAsync(2000);
  const response = await pending;
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({
    status: "unavailable",
    checks: { database: "fail", redis: "ok", gbx: "ok" },
  });
  expect(mocks.warn).toHaveBeenCalledTimes(1);
});
