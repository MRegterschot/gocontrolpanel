import { moveServer, restartWorker } from "@/actions/gbx/cluster";
import { getCluster } from "@/services/cluster";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findMany: vi.fn(),
  overview: vi.fn(),
  move: vi.fn(),
  restart: vi.fn(),
  audit: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/actions", () => ({ doServerActionWithAuth: mocks.auth }));
vi.mock("@/lib/dbclient", () => ({
  getClient: () => ({ servers: { findMany: mocks.findMany } }),
}));
vi.mock("@/lib/gbx-service", () => ({
  gbxService: {
    clusterOverview: mocks.overview,
    moveServer: mocks.move,
    restartWorker: mocks.restart,
  },
}));
vi.mock("@/actions/database/server-only/audit-logs", () => ({
  logAudit: mocks.audit,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockImplementation(async (_roles, action) => ({
    data: await action({ user: { id: "admin", admin: true } }),
  }));
});
it("merges only active database servers and preserves unowned rows", async () => {
  mocks.findMany.mockResolvedValue([
    { id: "a", name: "A" },
    { id: "b", name: "B" },
  ]);
  mocks.overview.mockResolvedValue({
    mode: "cluster",
    workers: [],
    servers: [
      {
        serverId: "a",
        owner: "node:1",
        leaseTtlMs: 10,
        held: true,
        status: null,
      },
      { serverId: "deleted", owner: null },
    ],
  });
  const result = await getCluster();
  expect(mocks.findMany).toHaveBeenCalledWith({
    where: { deletedAt: null },
    select: { id: true, name: true },
  });
  expect(result.data.servers).toEqual([
    {
      id: "a",
      name: "A",
      owner: "node:1",
      leaseTtlMs: 10,
      held: true,
      status: null,
    },
    {
      id: "b",
      name: "B",
      owner: null,
      leaseTtlMs: null,
      held: false,
      status: null,
    },
  ]);
  expect(mocks.auth.mock.calls[0][0]).toContain("servers:clients:view");
});
it("does not access the service when authorization fails", async () => {
  mocks.auth.mockResolvedValue({ error: "Unauthorized" });
  expect(await getCluster()).toEqual({ error: "Unauthorized" });
  await restartWorker("node:1");
  expect(mocks.overview).not.toHaveBeenCalled();
  expect(mocks.restart).not.toHaveBeenCalled();
  expect(mocks.auth.mock.calls[1][0]).toEqual(["servers:clients:manage"]);
});
it.each(["", "bad/path", "x".repeat(201)])(
  "rejects invalid worker id %s",
  async (worker) => {
    await expect(restartWorker(worker)).rejects.toThrow("Invalid worker id");
    expect(mocks.restart).not.toHaveBeenCalled();
  },
);
it("audits restart against the worker id", async () => {
  await restartWorker("node-a:1.lx2k3");
  expect(mocks.restart).toHaveBeenCalledWith("node-a:1.lx2k3");
  expect(mocks.audit).toHaveBeenCalledWith(
    "admin",
    "node-a:1.lx2k3",
    "cluster.worker.restart",
    { workerId: "node-a:1.lx2k3" },
  );
});
it("rejects invalid server ids before sending a move", async () => {
  await expect(moveServer("../bad", "node:1")).rejects.toThrow();
  expect(mocks.move).not.toHaveBeenCalled();
});

it("rejects non-admins even with client permissions", async () => {
  mocks.auth.mockImplementation(async (_roles, action) => {
    try {
      return { data: await action({ user: { id: "user", admin: false } }) };
    } catch {
      return { error: "Unauthorized" };
    }
  });
  expect(await getCluster()).toEqual({ error: "Unauthorized" });
  expect(await restartWorker("node:1")).toEqual({ error: "Unauthorized" });
  expect(await moveServer("server", "node:1")).toEqual({
    error: "Unauthorized",
  });
  expect(mocks.overview).not.toHaveBeenCalled();
  expect(mocks.findMany).not.toHaveBeenCalled();
  expect(mocks.restart).not.toHaveBeenCalled();
  expect(mocks.move).not.toHaveBeenCalled();
});
