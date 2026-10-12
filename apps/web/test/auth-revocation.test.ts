import { authOptions, withAuth } from "@/lib/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  byId: vi.fn(),
  byLogin: vi.fn(),
  upsert: vi.fn(),
  session: vi.fn(),
  identities: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/actions/database/server-only/auth", () => ({
  getUserById: mocks.byId,
  getUserByLogin: mocks.byLogin,
  upsertUserAuth: mocks.upsert,
  getAllGroupsWithServersAndMembers: async () => [],
  getPublicGroupsWithServers: async () => [],
}));
vi.mock("next-auth", () => ({ getServerSession: mocks.session }));
vi.mock("@/lib/api/nadeo", () => ({ getWebIdentities: mocks.identities }));
vi.mock("@/lib/config", () => ({
  default: { NADEO: {}, DEFAULT_ADMINS: [], DEFAULT_PERMISSIONS: [] },
}));
vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/sentry/report", () => ({ reportException: vi.fn() }));
const jwt = authOptions.callbacks!.jwt! as (args: any) => Promise<any>;
const row = {
  id: "u",
  admin: false,
  authenticated: true,
  deletedAt: null,
  ubiUid: "ubi",
  permissions: ["users:view"],
  groupMembers: [],
  userServers: [],
  hetznerProjectUsers: [],
};
const token = {
  id: "u",
  login: "login",
  accountId: "00000000-0000-4000-8000-000000000001",
};
const user = { accountId: token.accountId, displayName: "Player" };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.byId.mockResolvedValue(row);
  mocks.byLogin.mockResolvedValue(row);
  mocks.upsert.mockResolvedValue(row);
  mocks.identities.mockResolvedValue({ data: [] });
});
describe("session revocation", () => {
  it.each(["missing user", "database unavailable"])(
    "does not recreate/reset a user on refresh: %s",
    async (message) => {
      mocks.byId.mockRejectedValue(new Error(message));
      await expect(jwt({ token: { ...token } })).rejects.toThrow(message);
      expect(mocks.upsert).not.toHaveBeenCalled();
    },
  );
  it("does not bootstrap on a sign-in database failure", async () => {
    mocks.byLogin.mockRejectedValue(new Error("database unavailable"));
    await expect(jwt({ token: {}, user })).rejects.toThrow(
      "database unavailable",
    );
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("blocks a soft-deleted account even at fresh sign-in", async () => {
    mocks.byLogin.mockResolvedValue({ ...row, deletedAt: new Date() });
    await expect(jwt({ token: {}, user })).rejects.toThrow("Account disabled");
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("preserves existing privileges instead of applying defaults", async () => {
    const result = await jwt({ token: {}, user });
    expect(result.permissions).toEqual(["users:view"]);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("bootstraps a new account only during sign-in", async () => {
    mocks.byLogin.mockResolvedValue(null);
    await jwt({ token: {}, user });
    expect(mocks.upsert).toHaveBeenCalledOnce();
  });
  it("reads one session per withAuth check", async () => {
    mocks.session.mockResolvedValue({ user: { admin: true } });
    await withAuth(["users:view"]);
    expect(mocks.session).toHaveBeenCalledOnce();
  });
});
