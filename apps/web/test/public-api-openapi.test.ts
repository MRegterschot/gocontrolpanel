import { GET } from "@/app/api/v1/openapi.json/route";
import { buildOpenApiDocument } from "@/lib/public-api/openapi";
import { publicApiEndpoints } from "@tmcontrolpanel/shared/public-api";
import { describe, expect, it } from "vitest";

type Operation = {
  operationId: string;
  "x-required-scope"?: string;
  parameters?: { in: string; name: string }[];
  responses: Record<string, unknown>;
};

const doc = buildOpenApiDocument();

function operations(): Operation[] {
  return Object.values(doc.paths ?? {}).flatMap((item) =>
    Object.values(item as Record<string, Operation>),
  );
}

describe("public API OpenAPI document", () => {
  it("documents every contract endpoint once", () => {
    expect(
      operations()
        .map((o) => o.operationId)
        .sort(),
    ).toEqual(publicApiEndpoints.map((e) => e.id).sort());
  });

  it("requires a bearer key", () => {
    expect(doc.security).toEqual([{ apiKey: [] }]);
    expect(doc.components?.securitySchemes?.apiKey).toMatchObject({
      type: "http",
      scheme: "bearer",
    });
  });

  it("lists the scope and the auth failures on each operation", () => {
    for (const endpoint of publicApiEndpoints) {
      const op = doc.paths?.[endpoint.path]?.[endpoint.method] as Operation;
      expect(op["x-required-scope"]).toBe(endpoint.scope ?? undefined);
      expect(Object.keys(op.responses)).toEqual(
        expect.arrayContaining([String(endpoint.status), "401", "403", "429"]),
      );
    }
  });

  it("declares path parameters", () => {
    const op = doc.paths?.["/servers/{serverId}/players/{login}/kick"]
      ?.post as Operation;
    expect(
      op.parameters?.filter((p) => p.in === "path").map((p) => p.name),
    ).toEqual(["serverId", "login"]);
  });

  it("only requires a body that has required fields", () => {
    const body = (path: string) =>
      (doc.paths?.[path]?.post as { requestBody?: { required?: boolean } })
        .requestBody;
    expect(body("/servers/{serverId}/players/{login}/kick")?.required).toBe(
      false,
    );
    expect(body("/servers/{serverId}/jukebox")?.required).toBe(true);
  });

  it("resolves every schema reference", () => {
    const schemas = doc.components?.schemas ?? {};
    const refs = [
      ...JSON.stringify(doc).matchAll(/"#\/components\/schemas\/([^"]+)"/g),
    ].map((m) => m[1]);
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) expect(schemas, ref).toHaveProperty(ref);
    expect(Object.keys(schemas)).toEqual(
      expect.arrayContaining([
        "Error",
        "Server",
        "Map",
        "Match",
        "MatchDetail",
      ]),
    );
  });

  // Importers like Bruno, Postman and Insomnia can't call a relative server URL
  it("serves an absolute server URL for the caller's origin", async () => {
    const direct = await GET(
      new Request("http://localhost:3000/api/v1/openapi.json"),
    ).json();
    expect(direct.servers).toEqual([{ url: "http://localhost:3000/api/v1" }]);

    const proxied = await GET(
      new Request("http://internal:3000/api/v1/openapi.json", {
        headers: {
          "x-forwarded-host": "panel.example.com, internal",
          "x-forwarded-proto": "https",
        },
      }),
    ).json();
    expect(proxied.servers).toEqual([
      { url: "https://panel.example.com/api/v1" },
    ]);
    expect(proxied.paths).toEqual(direct.paths);
  });
});
