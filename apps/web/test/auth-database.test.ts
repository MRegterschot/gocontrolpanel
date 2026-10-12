import {
  getUserById,
  upsertUserAuth,
} from "@/actions/database/server-only/auth";
import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  upsert: vi.fn(),
  findUniqueOrThrow: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/dbclient", () => ({ getClient: () => ({ users: mocks }) }));
it("filters revoked accounts on every session refresh", async () => {
  await getUserById("user");
  expect(mocks.findUniqueOrThrow.mock.calls[0][0].where).toEqual({
    id: "user",
    authenticated: true,
    deletedAt: null,
  });
});
it("never overwrites privileges when an existing game identity first signs in", async () => {
  await upsertUserAuth({
    login: "login",
    nickName: "Player",
    path: "",
    admin: false,
    permissions: [],
    authenticated: true,
    ubiUid: "ubi",
  });
  const write = mocks.upsert.mock.calls[0][0];
  expect(write.where.deletedAt).toBeNull();
  expect(write.update).toEqual({
    authenticated: true,
    nickName: "Player",
    ubiUid: "ubi",
  });
  expect(write.create.admin).toBe(false);
});
