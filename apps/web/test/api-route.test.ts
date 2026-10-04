import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/sentry/report", () => ({ reportException: vi.fn() }));

import { tmxQuery } from "@/lib/api-query";
import {
  ApiValidationError,
  apiRoute,
  paginatedRoute,
  paginationQuery,
  parse,
  parseQuery,
  stringList,
} from "@/lib/api-route";
import { NextRequest } from "next/server";
import { z } from "zod";

const req = (path = "/api/x") => new NextRequest(`http://localhost${path}`);
const ctx = { params: Promise.resolve({}) };

beforeEach(() => {
  authMock.mockResolvedValue({ user: { id: "u1" } });
});

describe("apiRoute", () => {
  it("answers 401 without a session and never runs the handler", async () => {
    authMock.mockResolvedValue(null);
    const handler = vi.fn();
    const res = await apiRoute(handler)(req(), ctx);
    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("wraps a result in the envelope and marks it uncacheable", async () => {
    const res = await apiRoute(async () => ({ data: [1] }))(req(), ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await res.json()).toEqual({ data: [1] });
  });

  it.each([
    ["Unauthorized", 403],
    ["GbxServiceUnavailable", 503],
    ["ServerNotFound", 404],
    ["ServerNotConnected", 503],
    ["SomethingElse", 500],
  ])("maps a %s failure to %i", async (code, status) => {
    const res = await apiRoute(async () => ({
      data: undefined,
      error: "no",
      code,
    }))(req(), ctx);
    expect(res.status).toBe(status);
    expect((await res.json()).error).toBe("no");
  });

  it("answers 400 when the handler rejects the input", async () => {
    const res = await apiRoute(async () => {
      throw new ApiValidationError("bad");
    })(req(), ctx);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: "bad",
      code: "ValidationError",
    });
  });

  it("answers 500 when the handler throws", async () => {
    const res = await apiRoute(async () => {
      throw new Error("boom");
    })(req(), ctx);
    expect(res.status).toBe(500);
  });

  it("passes the awaited path params to the handler", async () => {
    const handler = vi.fn().mockResolvedValue({ data: 1 });
    await apiRoute<{ serverId: string }>(handler)(req(), {
      params: Promise.resolve({ serverId: "s1" }),
    });
    expect(handler.mock.calls[0][0].params).toEqual({ serverId: "s1" });
  });
});

describe("parseQuery", () => {
  it("collects repeated keys into lists", () => {
    const q = parseQuery(
      new URLSearchParams("ids=a&ids=b&one=c"),
      z.object({ ids: stringList, one: stringList }),
    );
    expect(q).toEqual({ ids: ["a", "b"], one: ["c"] });
  });

  it("rejects with a validation error that names the field", () => {
    expect(() =>
      parse(z.object({ n: z.coerce.number().int() }), { n: "x" }),
    ).toThrow(/n:/);
  });
});

describe("paginationQuery", () => {
  const read = (qs: string) =>
    parseQuery(new URLSearchParams(qs), paginationQuery);

  it("defaults to the first page, newest first", () => {
    expect(read("")).toEqual({
      pageIndex: 0,
      pageSize: 10,
      sortField: "createdAt",
      sortOrder: "desc",
      filter: "",
    });
  });

  it("refuses to hand out a whole table", () => {
    expect(() => read("pageSize=100000")).toThrow(ApiValidationError);
  });

  it("only sorts by a plain column name", () => {
    expect(() => read("sortField=user.password")).toThrow(ApiValidationError);
    expect(() => read("sortField=__proto__[x]")).toThrow(ApiValidationError);
    expect(read("sortField=nickName").sortField).toBe("nickName");
  });
});

describe("paginatedRoute", () => {
  it("hands the parsed page to the service, with the path params as fetchArgs", async () => {
    const service = vi
      .fn()
      .mockResolvedValue({ data: { data: [], totalCount: 0 } });
    const route = paginatedRoute<{ serverId: string }, { serverId: string }>(
      service,
      ({ serverId }) => ({ serverId }),
    );
    const res = await route(
      req("/api/servers/s1/matches?pageIndex=1&pageSize=5&filter=x"),
      {
        params: Promise.resolve({ serverId: "s1" }),
      },
    );
    expect(res.status).toBe(200);
    expect(service).toHaveBeenCalledWith(
      { pageIndex: 1, pageSize: 5 },
      { field: "createdAt", order: "desc" },
      "x",
      { serverId: "s1" },
    );
  });
});

describe("tmxQuery", () => {
  it("separates the paging from the search filters", () => {
    const q = parseQuery(
      new URLSearchParams("name=a&author=b&after=10&count=5"),
      tmxQuery,
    );
    expect(q).toEqual({
      queryParams: { name: "a", author: "b" },
      after: 10,
      count: 5,
    });
  });

  it("bounds the number of filters", () => {
    const many = Array.from({ length: 25 }, (_, i) => `k${i}=v`).join("&");
    expect(() => parseQuery(new URLSearchParams(many), tmxQuery)).toThrow(
      ApiValidationError,
    );
  });
});
