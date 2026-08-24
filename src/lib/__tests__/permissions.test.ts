import type { JWT } from "next-auth/jwt";
import { describe, expect, it } from "vitest";
import {
  hasPermissionSync,
  hasPermissionsJWTSync,
  resolvePermissions,
} from "../utils";

/**
 * Builds a JWT with only the fields the permission engine reads, so these tests
 * do not have to track unrelated changes to the session shape.
 */
function jwt(overrides: Partial<JWT> = {}): JWT {
  return {
    id: "user-1",
    accountId: "account-1",
    login: "login-1",
    displayName: "Player One",
    admin: false,
    permissions: [],
    groups: [],
    adminGroups: [],
    projects: [],
    servers: [],
    ...overrides,
  } as JWT;
}

const server = (id: string) => ({ id, name: `server-${id}` }) as never;

describe("resolvePermissions", () => {
  it("does not mutate the JWT it is given", () => {
    const token = jwt({
      permissions: ["servers:view"],
      groups: [
        {
          id: "g1",
          name: "Group One",
          role: "Admin",
          order: 0,
          servers: [server("s1")],
        },
      ],
      servers: [{ id: "s2", name: "Two", role: "Moderator" }],
      projects: [{ id: "p1", name: "Project", role: "Admin" }],
    } as Partial<JWT>);

    const before = [...token.permissions];
    resolvePermissions(token);
    resolvePermissions(token);

    // The previous implementation pushed derived entries straight into
    // token.permissions, so the array grew on every single check.
    expect(token.permissions).toEqual(before);
    expect(token.permissions).toHaveLength(1);
  });

  it("keeps the explicitly granted permissions", () => {
    const resolved = resolvePermissions(
      jwt({ permissions: ["users:view", "users:edit"] }),
    );
    expect(resolved.has("users:view")).toBe(true);
    expect(resolved.has("users:edit")).toBe(true);
  });

  it("derives group permissions, both bare and id-scoped", () => {
    const resolved = resolvePermissions(
      jwt({
        groups: [
          {
            id: "g1",
            name: "Group One",
            role: "Admin",
            order: 0,
            servers: [server("s1")],
          },
        ],
      } as Partial<JWT>),
    );

    expect(resolved.has("groups::admin")).toBe(true);
    expect(resolved.has("groups:g1:admin")).toBe(true);
    expect(resolved.has("group:servers::admin")).toBe(true);
    expect(resolved.has("group:servers:s1:admin")).toBe(true);
  });

  it("derives project and server permissions", () => {
    const resolved = resolvePermissions(
      jwt({
        projects: [{ id: "p1", name: "Project", role: "Admin" }],
        servers: [{ id: "s1", name: "One", role: "Moderator" }],
      } as Partial<JWT>),
    );

    expect(resolved.has("hetzner::admin")).toBe(true);
    expect(resolved.has("hetzner:p1:admin")).toBe(true);
    expect(resolved.has("servers::moderator")).toBe(true);
    expect(resolved.has("servers:s1:moderator")).toBe(true);
  });

  it("tolerates a token whose collections are missing", () => {
    const bare = { admin: false, permissions: [] } as unknown as JWT;
    expect(() => resolvePermissions(bare)).not.toThrow();
    expect(resolvePermissions(bare).size).toBe(0);
  });
});

describe("hasPermissionsJWTSync", () => {
  it("grants everything to an admin", () => {
    expect(
      hasPermissionsJWTSync(jwt({ admin: true }), ["anything:at:all"]),
    ).toBe(true);
  });

  it("grants when no permissions are required", () => {
    expect(hasPermissionsJWTSync(jwt(), [])).toBe(true);
    expect(hasPermissionsJWTSync(jwt())).toBe(true);
  });

  it("denies a user without the permission", () => {
    expect(hasPermissionsJWTSync(jwt(), ["servers:view"])).toBe(false);
  });

  it("grants when any one of the required permissions matches", () => {
    const token = jwt({ permissions: ["servers:edit"] });
    expect(hasPermissionsJWTSync(token, ["servers:view", "servers:edit"])).toBe(
      true,
    );
  });

  it("substitutes :id with the supplied id", () => {
    const token = jwt({
      servers: [{ id: "s1", name: "One", role: "Admin" }],
    } as Partial<JWT>);

    expect(hasPermissionsJWTSync(token, ["servers:id:admin"], "s1")).toBe(true);
    expect(hasPermissionsJWTSync(token, ["servers:id:admin"], "s2")).toBe(
      false,
    );
  });

  it("stays stable across repeated checks", () => {
    const token = jwt({
      permissions: ["servers:view"],
      servers: [{ id: "s1", name: "One", role: "Admin" }],
    } as Partial<JWT>);

    // Under the mutating implementation the token accumulated derived entries,
    // so a later check could see permissions an earlier one had synthesised.
    expect(hasPermissionsJWTSync(token, ["servers:id:admin"], "s1")).toBe(true);
    expect(hasPermissionsJWTSync(token, ["servers:id:admin"], "s2")).toBe(
      false,
    );
    expect(hasPermissionsJWTSync(token, ["groups::admin"])).toBe(false);
    expect(token.permissions).toEqual(["servers:view"]);
  });
});

describe("hasPermissionSync", () => {
  it("denies when there is no session", () => {
    expect(hasPermissionSync(null, ["servers:view"])).toBe(false);
  });

  it("reads the permissions off the session user", () => {
    const session = {
      user: jwt({ permissions: ["servers:view"] }),
      expires: "",
    } as never;
    expect(hasPermissionSync(session, ["servers:view"])).toBe(true);
    expect(hasPermissionSync(session, ["servers:delete"])).toBe(false);
  });
});
