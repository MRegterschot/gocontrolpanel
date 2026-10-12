import { deleteAuditLogById } from "@/actions/database/audit-logs";
import { hasPermission, sessionClaimsSchema } from "@gcp/shared";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  user: {} as any,
  findUnique: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({
  withAuth: async (roles: string[]) => {
    if (!hasPermission(sessionClaimsSchema.parse(mocks.user), roles))
      throw new Error("Unauthorized");
    return { user: mocks.user };
  },
}));
vi.mock("@/lib/dbclient", () => ({
  getClient: () => ({ auditLogs: mocks, $transaction: mocks.transaction }),
}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));
vi.mock("@/lib/sentry/report", () => ({ reportException: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = {
    id: "user",
    admin: false,
    permissions: [],
    servers: [{ id: "server", name: "Server", role: "Admin" }],
    groups: [],
    projects: [],
  };
});
it("does not let a tenant admin erase their own audit history", async () => {
  expect((await deleteAuditLogById("audit")).error).toBe("Unauthorized");
  expect(mocks.findUnique).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
});
it("records explicitly authorized deletion in the same transaction", async () => {
  mocks.user.permissions = ["audit-logs:delete"];
  mocks.findUnique.mockResolvedValue({
    action: "server.edit",
    targetType: "server",
    targetId: "server",
  });
  await deleteAuditLogById("audit");
  expect(mocks.transaction).toHaveBeenCalledOnce();
  expect(mocks.create.mock.calls[0][0].data).toMatchObject({
    action: "audit-logs.delete",
    targetId: "audit",
  });
});
