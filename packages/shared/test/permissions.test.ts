import { describe, expect, it } from "vitest";
import {
  canViewServer,
  expandPermissions,
  getAccessibleServers,
  getAdminServerIds,
  hasPermission,
  serverPermissions,
} from "../src/permissions";
import { makeClaims } from "./fixtures";

describe("hasPermission", () => {
  it("grants everything to admins", () => {
    expect(hasPermission(makeClaims({ admin: true }), ["users:delete"])).toBe(true);
  });

  it("grants when no permissions are required", () => {
    expect(hasPermission(makeClaims(), [])).toBe(true);
    expect(hasPermission(makeClaims(), undefined)).toBe(true);
  });

  it("matches plain permissions", () => {
    const claims = makeClaims({ permissions: ["servers:clients:view"] });
    expect(hasPermission(claims, ["servers:clients:view"])).toBe(true);
    expect(hasPermission(claims, ["servers:clients:manage"])).toBe(false);
  });

  it("resolves :id against direct server roles", () => {
    const claims = makeClaims({
      servers: [{ id: "s1", name: "One", role: "Moderator" }],
    });
    expect(hasPermission(claims, serverPermissions.moderator, "s1")).toBe(true);
    expect(hasPermission(claims, serverPermissions.admin, "s1")).toBe(false);
    expect(hasPermission(claims, serverPermissions.moderator, "s2")).toBe(false);
  });

  it("resolves :id against group roles", () => {
    const claims = makeClaims({
      groups: [
        { id: "g1", name: "G", role: "Admin", servers: [{ id: "s9", name: "Nine" }] },
      ],
    });
    expect(hasPermission(claims, serverPermissions.admin, "s9")).toBe(true);
    expect(hasPermission(claims, ["groups:g1:admin"])).toBe(true);
  });

  it("does not mutate the claims", () => {
    const claims = makeClaims({
      permissions: ["a"],
      servers: [{ id: "s1", name: "One", role: "Admin" }],
    });
    hasPermission(claims, ["b"]);
    hasPermission(claims, ["b"]);
    expect(claims.permissions).toEqual(["a"]);
  });
});

describe("expandPermissions", () => {
  it("expands project roles", () => {
    const claims = makeClaims({ projects: [{ id: "p1", name: "P", role: "Moderator" }] });
    expect(expandPermissions(claims).has("hetzner:p1:moderator")).toBe(true);
  });
});

describe("canViewServer", () => {
  it("allows admins, direct members and group members", () => {
    expect(canViewServer(makeClaims({ admin: true }), "x")).toBe(true);
    expect(
      canViewServer(makeClaims({ servers: [{ id: "x", name: "X", role: "Member" }] }), "x"),
    ).toBe(true);
    expect(
      canViewServer(
        makeClaims({
          groups: [{ id: "g", name: "G", role: "Member", servers: [{ id: "x", name: "X" }] }],
        }),
        "x",
      ),
    ).toBe(true);
  });

  it("denies everyone else", () => {
    expect(canViewServer(makeClaims(), "x")).toBe(false);
  });
});

describe("getAccessibleServers", () => {
  it("merges group and admin-group servers without duplicates", () => {
    const claims = makeClaims({
      groups: [{ id: "g", name: "G", role: "Member", servers: [{ id: "a", name: "A" }] }],
      adminGroups: [
        { id: "ag", name: "AG", servers: [{ id: "a", name: "A" }, { id: "b", name: "B" }] },
      ],
    });
    expect(getAccessibleServers(claims).map((s) => s.id).sort()).toEqual(["a", "b"]);
  });
});

describe("getAdminServerIds", () => {
  it("includes direct admin servers and group admin servers only", () => {
    const claims = makeClaims({
      servers: [
        { id: "direct", name: "D", role: "Admin" },
        { id: "mod", name: "M", role: "Moderator" },
      ],
      groups: [
        { id: "g1", name: "G1", role: "Admin", servers: [{ id: "grp", name: "Grp" }] },
        { id: "g2", name: "G2", role: "Member", servers: [{ id: "member", name: "Mem" }] },
      ],
    });
    expect([...getAdminServerIds(claims)].sort()).toEqual(["direct", "grp"]);
  });
});
