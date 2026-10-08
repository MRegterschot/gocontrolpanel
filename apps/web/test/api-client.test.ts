import { apiGet, buildUrl, fetchPaginated } from "@/lib/api-client/http";
import { afterEach, describe, expect, it, vi } from "vitest";

function mockFetch(status: number, body: string) {
  const fn = vi.fn().mockResolvedValue(new Response(body, { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("buildUrl", () => {
  it("skips empty values and repeats arrays", () => {
    expect(
      buildUrl("/api/x", { a: 1, b: undefined, c: null, ids: ["u1", "u2"] }),
    ).toBe("/api/x?a=1&ids=u1&ids=u2");
  });

  it("leaves the path alone without a query", () => {
    expect(buildUrl("/api/x", {})).toBe("/api/x");
  });
});

describe("apiGet", () => {
  it("returns the { data } envelope", async () => {
    mockFetch(200, JSON.stringify({ data: [1, 2] }));
    expect(await apiGet("/api/x")).toEqual({ data: [1, 2] });
  });

  it("keeps the error message of a failed request", async () => {
    mockFetch(
      403,
      JSON.stringify({ error: "Unauthorized", code: "Unauthorized" }),
    );
    const res = await apiGet("/api/x");
    expect(res.error).toBe("Unauthorized");
  });

  it("reports a body that is not JSON by status", async () => {
    mockFetch(502, "<html>Bad gateway</html>");
    expect((await apiGet("/api/x")).error).toBe("Request failed (502)");
  });

  it("reports an error status without an error message", async () => {
    mockFetch(500, JSON.stringify({ data: null }));
    expect((await apiGet("/api/x")).error).toBe("Request failed (500)");
  });

  it("does not throw when the network is down", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    expect((await apiGet("/api/x")).error).toBe("Could not reach the server");
  });

  it("rethrows an abort so the caller can ignore a stale request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("aborted", "AbortError")),
    );
    await expect(apiGet("/api/x")).rejects.toThrow("aborted");
  });

  it("revives only full ISO timestamps, and only when asked", async () => {
    const body = JSON.stringify({
      data: {
        createdAt: "2026-01-02T03:04:05.678Z",
        name: "2026-01-02",
        at: "2026-01-02T03:04:05+00:00",
      },
    });
    mockFetch(200, body);
    const plain = await apiGet<Record<string, unknown>>("/api/x");
    expect(plain.data.createdAt).toBe("2026-01-02T03:04:05.678Z");

    mockFetch(200, body);
    const revived = await apiGet<Record<string, unknown>>("/api/x", undefined, {
      dates: true,
    });
    expect(revived.data.createdAt).toEqual(
      new Date("2026-01-02T03:04:05.678Z"),
    );
    expect(revived.data.name).toBe("2026-01-02");
    expect(revived.data.at).toBe("2026-01-02T03:04:05+00:00");
  });
});

describe("fetchPaginated", () => {
  it("sends the shared pagination query", async () => {
    const fetchMock = mockFetch(
      200,
      JSON.stringify({ data: { data: [], totalCount: 0 } }),
    );
    await fetchPaginated(
      "/api/roles",
      { pageIndex: 2, pageSize: 25 },
      { field: "name", order: "asc" },
      "adm",
    );
    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/roles?pageIndex=2&pageSize=25&sortField=name&sortOrder=asc&filter=adm",
    );
  });

  it("omits an empty filter", async () => {
    const fetchMock = mockFetch(
      200,
      JSON.stringify({ data: { data: [], totalCount: 0 } }),
    );
    await fetchPaginated(
      "/api/roles",
      { pageIndex: 0, pageSize: 10 },
      { field: "createdAt", order: "desc" },
      "",
    );
    expect(fetchMock.mock.calls[0][0]).not.toContain("filter");
  });
});

it("sends history filters with pagination without letting them override page limits", async () => {
  const fetch = mockFetch(
    200,
    JSON.stringify({ data: { data: [], totalCount: 0 } }),
  );
  await fetchPaginated(
    "/api/requests",
    { pageIndex: 0, pageSize: 10 },
    { field: "createdAt", order: "desc" },
    "map",
    undefined,
    { status: "failed", login: "bob", pageSize: "1000" },
  );
  const query = new URL(fetch.mock.calls[0][0], "http://localhost")
    .searchParams;
  expect(query.get("status")).toBe("failed");
  expect(query.get("login")).toBe("bob");
  expect(query.get("pageSize")).toBe("10");
});
