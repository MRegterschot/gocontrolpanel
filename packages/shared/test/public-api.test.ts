import { describe, expect, it } from "vitest";
import { isApiKeyScope } from "../src/api-keys";
import { type ApiEndpoint, publicApiEndpoints } from "../src/public-api";

const endpoints: readonly ApiEndpoint[] = publicApiEndpoints;

describe("public API contract", () => {
  it("has unique operation IDs and routes", () => {
    const ids = endpoints.map((e) => e.id);
    const routes = endpoints.map((e) => `${e.method} ${e.path}`);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it.each(endpoints.map((e) => [e.id, e] as const))(
    "%s declares a schema for exactly its path parameters",
    (_, endpoint) => {
      const inPath = [...endpoint.path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
      const declared = Object.keys(endpoint.params?.shape ?? {});
      expect(declared.sort()).toEqual(inPath.sort());
    },
  );

  it.each(endpoints.map((e) => [e.id, e] as const))(
    "%s has a known scope and a response matching its status",
    (_, endpoint) => {
      expect(endpoint.scope === null || isApiKeyScope(endpoint.scope)).toBe(
        true,
      );
      expect(endpoint.response === undefined).toBe(endpoint.status === 204);
    },
  );

  it("only lets the server list through without a scope", () => {
    expect(endpoints.filter((e) => e.scope === null).map((e) => e.id)).toEqual([
      "listServers",
    ]);
  });

  it("scopes every server route", () => {
    for (const endpoint of endpoints) {
      if (endpoint.path.startsWith("/servers/{serverId}")) {
        expect(endpoint.scope, endpoint.id).not.toBeNull();
      }
    }
  });
});
