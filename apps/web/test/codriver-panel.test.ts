import { hasPermission, sessionClaimsSchema } from "@gcp/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: null as any,
  actor: vi.fn(),
  server: vi.fn(),
  handle: vi.fn(),
  requests: vi.fn(),
  count: vi.fn(),
  servers: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({
  withAuth: async (permissions: string[]) => {
    if (
      !mocks.session ||
      (permissions.length && !hasPermission(mocks.session.user, permissions))
    )
      throw new Error("Unauthorized");
    return mocks.session;
  },
  auth: async () => mocks.session,
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn() },
  getLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));
vi.mock("@/lib/sentry/report", () => ({ reportException: vi.fn() }));
vi.mock("@/lib/actor", async (original) => ({
  ...(await original<typeof import("@/lib/actor")>()),
  actorForLogin: mocks.actor,
}));
vi.mock("@/lib/codriver/handle", () => ({
  handleCodriverRequest: mocks.handle,
}));
vi.mock("@/lib/dbclient", () => ({
  getClient: () => ({
    servers: { findFirst: mocks.server, findMany: mocks.servers },
    codriverRequests: { findMany: mocks.requests, count: mocks.count },
  }),
}));

import { sendCodriverMessage } from "@/actions/codriver";
import { GET as historyGET } from "@/app/api/servers/[serverId]/codriver/requests/route";
import {
  getCodriverPanelRequestsPaginated,
  getCodriverRequestsPaginated,
} from "@/services/codriver";
import { getCodriverUsage } from "@/services/codriver-usage";
import { NextRequest } from "next/server";

const serverId = "server-a";
const pagination = { pageIndex: 1, pageSize: 10 };
const sorting = { field: "createdAt", order: "desc" as const };
function claims(role = "Admin", admin = false) {
  return sessionClaimsSchema.parse({
    id: "u1",
    login: "trusted-login",
    displayName: "Player",
    admin,
    servers: [{ id: serverId, name: "A", role }],
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session = { user: claims() };
  mocks.actor.mockImplementation(async () => ({
    userId: "u1",
    login: "trusted-login",
    displayName: "Player",
    claims: mocks.session.user,
  }));
  mocks.server.mockResolvedValue({ id: serverId });
  mocks.handle.mockResolvedValue({
    status: "needs_confirmation",
    reply: "Skip? Reply /co yes or /co no.",
  });
  mocks.requests.mockResolvedValue([]);
  mocks.count.mockResolvedValue(0);
  mocks.servers.mockResolvedValue([
    { id: serverId, name: "A", groupServers: [] },
  ]);
});

describe("panel chat authorization", () => {
  it("uses the authenticated identity and panel source for member messages", async () => {
    mocks.session.user = claims("Member");
    const result = await sendCodriverMessage(serverId, "status");
    expect(result.data).toEqual({
      status: "needs_confirmation",
      reply: "Skip? Confirm or cancel below.",
    });
    expect(mocks.handle).toHaveBeenCalledWith(
      {
        serverId,
        login: "trusted-login",
        text: "status",
        source: "panel",
        confirmationId: undefined,
      },
      undefined,
      expect.objectContaining({ userId: "u1" }),
    );
  });
  it("rejects another server and unlinked or removed users", async () => {
    expect((await sendCodriverMessage("server-b", "yes")).error).toBeTruthy();
    mocks.actor.mockResolvedValue({
      userId: null,
      claims: claims(),
      login: "trusted-login",
    });
    expect((await sendCodriverMessage(serverId, "yes")).error).toBeTruthy();
    expect(mocks.handle).not.toHaveBeenCalled();
  });
  it("refreshes membership before confirming", async () => {
    mocks.actor.mockResolvedValue({
      userId: "u1",
      login: "trusted-login",
      claims: sessionClaimsSchema.parse({ id: "u1", admin: false }),
    });
    expect((await sendCodriverMessage(serverId, "yes")).error).toBeTruthy();
    expect(mocks.handle).not.toHaveBeenCalled();
  });
  it("rejects deleted servers, empty and oversized requests", async () => {
    expect((await sendCodriverMessage(serverId, " ")).code).toBe(
      "ValidationError",
    );
    expect((await sendCodriverMessage(serverId, "x".repeat(301))).code).toBe(
      "ValidationError",
    );
    mocks.server.mockResolvedValue(null);
    expect((await sendCodriverMessage(serverId, "status")).code).toBe(
      "ServerNotFound",
    );
    expect(mocks.handle).not.toHaveBeenCalled();
  });
});

describe("history and usage isolation", () => {
  it("scopes both rows and count to the server and combines all filters", async () => {
    await getCodriverRequestsPaginated(pagination, sorting, "map", {
      serverId,
      status: "failed",
      login: "bob",
    });
    const where = {
      serverId,
      server: { deletedAt: null },
      status: "failed",
      login: { contains: "bob" },
      OR: [
        { login: { contains: "map" } },
        { text: { contains: "map" } },
        { feedback: { contains: "map" } },
      ],
    };
    expect(mocks.requests).toHaveBeenCalledWith(
      expect.objectContaining({
        where,
        skip: 10,
        take: 10,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    );
    expect(mocks.count).toHaveBeenCalledWith({ where });
  });
  it("rejects moderators and other-server admins before reading history or usage", async () => {
    mocks.session.user = claims("Moderator");
    expect(
      (
        await getCodriverRequestsPaginated(pagination, sorting, "", {
          serverId,
        })
      ).error,
    ).toBeTruthy();
    expect((await getCodriverUsage(serverId)).error).toBeTruthy();
    mocks.session.user = claims();
    expect((await getCodriverUsage("other")).error).toBeTruthy();
    expect(mocks.requests).not.toHaveBeenCalled();
  });
  it("requires panel admin for aggregate history and usage", async () => {
    expect(
      (await getCodriverPanelRequestsPaginated(pagination, sorting, "")).error,
    ).toBeTruthy();
    expect((await getCodriverUsage()).error).toBeTruthy();
    expect(mocks.requests).not.toHaveBeenCalled();
    mocks.session.user = claims("Admin", true);
    expect((await getCodriverUsage()).data?.requests).toBe(0);
    expect(mocks.requests).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { server: { deletedAt: null }, createdAt: expect.anything() },
      }),
    );
  });
  it("rejects invalid or repeated filters at the GET boundary", async () => {
    for (const query of [
      "status=unknown",
      "status=done&status=failed",
      "pageSize=1000",
      "login=" + "x".repeat(101),
    ]) {
      const response = await historyGET(
        new NextRequest(
          `http://localhost/api/servers/${serverId}/codriver/requests?${query}`,
        ),
        { params: Promise.resolve({ serverId }) },
      );
      expect(response.status).toBe(400);
    }
    expect(mocks.requests).not.toHaveBeenCalled();
  });
});
