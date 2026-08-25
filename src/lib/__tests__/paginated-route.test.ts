import { describe, expect, it, vi } from "vitest";
import { paginatedRoute } from "../api/paginated-route";

function request(query: string) {
  return new Request(`http://localhost/api/things${query}`) as never;
}
const noParams = { params: Promise.resolve({}) };

describe("paginatedRoute", () => {
  it("maps query parameters onto the action's arguments", async () => {
    const action = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { data: [], totalCount: 0 } });

    await paginatedRoute(action)(
      request("?page=2&pageSize=25&sortField=name&sortOrder=asc&filter=abc"),
      noParams,
    );

    expect(action).toHaveBeenCalledWith(
      { pageIndex: 2, pageSize: 25 },
      { field: "name", order: "asc" },
      "abc",
      undefined,
    );
  });

  it("applies defaults when parameters are absent", async () => {
    const action = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { data: [], totalCount: 0 } });

    await paginatedRoute(action)(request(""), noParams);

    expect(action).toHaveBeenCalledWith(
      { pageIndex: 0, pageSize: 10 },
      { field: "createdAt", order: "desc" },
      "",
      undefined,
    );
  });

  it("rejects nonsense parameters instead of passing them through", async () => {
    const action = vi.fn();

    for (const q of [
      "?page=-1",
      "?pageSize=0",
      "?pageSize=99999",
      "?sortOrder=sideways",
    ]) {
      const response = await paginatedRoute(action)(request(q), noParams);
      expect(response.status).toBe(400);
    }

    expect(action).not.toHaveBeenCalled();
  });

  it("passes route params to the action via buildArgs", async () => {
    const action = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { data: [], totalCount: 0 } });

    await paginatedRoute(action, (_r, params) => ({
      projectId: params.projectId,
    }))(request(""), { params: Promise.resolve({ projectId: "p-1" }) });

    expect(action).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "",
      { projectId: "p-1" },
    );
  });

  it("translates an action's error code into an HTTP status", async () => {
    const cases = [
      ["Unauthorized", 403],
      ["ValidationError", 400],
      ["GbxConnectionError", 500],
    ] as const;

    for (const [code, status] of cases) {
      const action = vi
        .fn()
        .mockResolvedValue({ ok: false, error: "nope", code });
      const response = await paginatedRoute(action)(request(""), noParams);
      expect(response.status).toBe(status);
      await expect(response.json()).resolves.toEqual({ error: "nope", code });
    }
  });

  it("never lets a shared cache hold a permission-dependent response", async () => {
    const action = vi
      .fn()
      .mockResolvedValue({ ok: true, data: { data: [1], totalCount: 1 } });

    const response = await paginatedRoute(action)(request(""), noParams);

    expect(response.headers.get("Cache-Control")).toContain("private");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
});
