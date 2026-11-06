import {
  getDashboardActivity,
  getDashboardAdminStats,
  getDashboardHetznerProjects,
} from "@/services/dashboard";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: {} as any,
  count: vi.fn(),
  findMany: vi.fn(),
  getHetznerServers: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({
  withAuth: async () => ({ user: mocks.user }),
}));
vi.mock("@/actions/hetzner/util", () => ({
  getHetznerServers: mocks.getHetznerServers,
}));
vi.mock("@/lib/dbclient", () => {
  const model = { count: mocks.count, findMany: mocks.findMany };
  return {
    getClient: () =>
      new Proxy({}, { get: () => model }) as Record<string, typeof model>,
  };
});
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));
vi.mock("@/lib/sentry/report", () => ({ reportException: vi.fn() }));

const hetznerServer = (id: number) => ({
  id,
  name: `tm-${id}`,
  status: "running",
  created: "2026-10-01T00:00:00+00:00",
  server_type: { name: "cx22" },
  location: { name: "nbg1", city: "Nuremberg" },
  public_net: { ipv4: { ip: "1.2.3.4" } },
  labels: { superadmin_password: "secret" },
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.count.mockResolvedValue(0);
  mocks.findMany.mockResolvedValue([]);
  mocks.user = {
    id: "user",
    admin: false,
    permissions: [],
    servers: [{ id: "direct", name: "Direct", role: "Moderator" }],
    groups: [{ id: "g", role: "Member", servers: [{ id: "grouped" }] }],
    projects: [],
  };
});

it("keeps panel totals from non-admins", async () => {
  expect((await getDashboardAdminStats()).error).toBe("Unauthorized");
  expect(mocks.count).not.toHaveBeenCalled();
});

it("scopes activity to the servers the user can open", async () => {
  await getDashboardActivity();
  for (const [args] of mocks.count.mock.calls) {
    expect(args.where.serverId).toEqual({ in: ["direct", "grouped"] });
  }
});

it("drops credential labels and isolates failing projects", async () => {
  mocks.user.projects = [
    { id: "ok", name: "Ok", role: "Moderator" },
    { id: "broken", name: "Broken", role: "Admin" },
  ];
  mocks.getHetznerServers.mockImplementation(async (id: string) => {
    if (id === "broken") throw new Error("Invalid token");
    return {
      servers: [hetznerServer(1)],
      meta: { pagination: { total_entries: 1 } },
    };
  });

  const { data } = await getDashboardHetznerProjects();

  expect(data[0].servers[0]).not.toHaveProperty("labels");
  expect(JSON.stringify(data)).not.toContain("secret");
  expect(data[0].servers[0]).toMatchObject({
    type: "cx22",
    location: "Nuremberg",
  });
  expect(data[1]).toMatchObject({ servers: [], error: "Invalid token" });
});
