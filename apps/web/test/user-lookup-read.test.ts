import { getUsersByLogins, searchUser } from "@/services/database/users";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  createMany: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/actions", () => ({
  doServerActionWithAuth: async (_: unknown, action: () => unknown) => action(),
}));
vi.mock("@/lib/dbclient", () => ({ getClient: () => ({ users: mocks }) }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.findMany.mockResolvedValue([]);
  mocks.findFirst.mockResolvedValue(null);
});
describe("user directory GET reads", () => {
  it("does not create records for unknown logins or names", async () => {
    await getUsersByLogins(["abcdefghijklmnopqrstuv"]);
    await searchUser("Unknown player");
    expect(mocks.createMany).not.toHaveBeenCalled();
    expect(mocks.findMany.mock.calls[0][0].where.deletedAt).toBeNull();
  });
  it("rejects oversized lists and malformed logins before querying", async () => {
    await expect(
      getUsersByLogins(Array(101).fill("abcdefghijklmnopqrstuv")),
    ).rejects.toThrow();
    await expect(getUsersByLogins(["invalid"])).rejects.toThrow();
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});
