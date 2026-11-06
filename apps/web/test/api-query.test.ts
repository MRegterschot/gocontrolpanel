import { queryKeys, unwrap } from "@/lib/api-client/query";
import { describe, expect, it } from "vitest";

describe("unwrap", () => {
  it("returns the data of a successful response", async () => {
    expect(await unwrap(Promise.resolve({ data: [1, 2] }))).toEqual([1, 2]);
  });

  it("throws the error of a failed response so the query fails", async () => {
    await expect(
      unwrap(Promise.resolve({ data: undefined, error: "No access" }), "GetX"),
    ).rejects.toMatchObject({ message: "No access", name: "GetX" });
  });
});

describe("queryKeys", () => {
  it("nests per-server keys under the server, so one invalidation covers them all", () => {
    const server = queryKeys.server("s1");
    for (const key of [
      queryKeys.banlist("s1"),
      queryKeys.players("s1"),
      queryKeys.jukebox("s1"),
    ]) {
      expect(key.slice(0, server.length)).toEqual([...server]);
    }
  });

  it("keeps pages of the same table apart", () => {
    const a = queryKeys.paginated(
      "/api/roles",
      { pageIndex: 0, pageSize: 10 },
      { field: "name", order: "asc" },
      "",
    );
    const b = queryKeys.paginated(
      "/api/roles",
      { pageIndex: 1, pageSize: 10 },
      { field: "name", order: "asc" },
      "",
    );
    expect(a).not.toEqual(b);
  });
});
