import { routePermissions } from "@/routes";
import { describe, expect, it } from "vitest";
import { routeGuardFor } from "../route-guard";

describe("routeGuardFor", () => {
  it("matches each admin section to the permission its page checks", () => {
    expect(routeGuardFor("/admin/users")?.permissions).toBe(
      routePermissions.admin.users.view,
    );
    expect(routeGuardFor("/admin/groups")?.permissions).toBe(
      routePermissions.admin.groups.view,
    );
    expect(routeGuardFor("/admin/roles")?.permissions).toBe(
      routePermissions.admin.roles.view,
    );
    expect(routeGuardFor("/admin/servers")?.permissions).toBe(
      routePermissions.admin.servers.view,
    );
    expect(routeGuardFor("/admin/audit-logs")?.permissions).toBe(
      routePermissions.admin.auditLogs.view,
    );
    expect(routeGuardFor("/admin/hetzner")?.permissions).toBe(
      routePermissions.admin.hetzner.view,
    );
  });

  it("uses the id-scoped permission for a Hetzner project page", () => {
    const guard = routeGuardFor("/admin/hetzner/proj-123");
    expect(guard?.permissions).toBe(
      routePermissions.admin.hetzner.servers.view,
    );
    expect(guard?.id).toBe("proj-123");
  });

  it("does not let the project rule swallow the Hetzner index", () => {
    // Longest-prefix ordering: "/admin/hetzner/" must not capture "/admin/hetzner".
    expect(routeGuardFor("/admin/hetzner")?.permissions).toBe(
      routePermissions.admin.hetzner.view,
    );
    expect(routeGuardFor("/admin/hetzner")?.id).toBe("");
    expect(routeGuardFor("/admin/hetzner/")).toBeNull();
  });

  it("takes only the first segment as the id", () => {
    expect(routeGuardFor("/admin/hetzner/proj-123/servers")?.id).toBe(
      "proj-123",
    );
  });

  it("leaves non-admin routes to their own page checks", () => {
    expect(routeGuardFor("/")).toBeNull();
    expect(routeGuardFor("/server/abc-123/live")).toBeNull();
    expect(routeGuardFor("/server/abc-123/game")).toBeNull();
    expect(routeGuardFor("/login")).toBeNull();
  });

  it("still guards nested admin paths", () => {
    expect(routeGuardFor("/admin/users/anything")?.permissions).toBe(
      routePermissions.admin.users.view,
    );
  });
});
