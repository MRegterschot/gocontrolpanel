import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  history: vi.fn(),
  send: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));
vi.mock("@/lib/sentry/report", () => ({ reportException: vi.fn() }));
vi.mock("@/lib/ratelimiter", () => ({
  takeRateLimitToken: async () => ({ allowed: true, retryAfterMs: 0 }),
}));
vi.mock("@/lib/api-keys/authenticate", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  authenticateApiKey: mocks.authenticate,
}));
vi.mock("@/services/gbx/advanced", () => ({ getChatHistoryAs: mocks.history }));
vi.mock("@/actions/gbx/server-only/advanced", () => ({
  sendChatMessageAs: mocks.send,
}));

import * as chatRoute from "@/app/api/v1/servers/[serverId]/chat/route";
import { actor, onA, principal, req } from "./helpers/public-api";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authenticate.mockResolvedValue(principal());
});

describe("v1 chat", () => {
  it("returns the chat lines", async () => {
    mocks.history.mockResolvedValue(["$fffOne: hi", "Two: gg"]);
    const res = await chatRoute.GET(req("/servers/server-a/chat"), onA());
    expect(mocks.history).toHaveBeenCalledWith(actor, "server-a");
    expect(await res.json()).toEqual({ data: ["$fffOne: hi", "Two: gg"] });
  });

  it("sends a trimmed message to everyone or one player", async () => {
    let res = await chatRoute.POST(
      req("/servers/server-a/chat", {
        method: "POST",
        body: { message: "  Next map in 1 minute " },
      }),
      onA(),
    );
    expect(res.status).toBe(204);
    expect(mocks.send).toHaveBeenLastCalledWith(
      actor,
      "server-a",
      "Next map in 1 minute",
      undefined,
    );

    res = await chatRoute.POST(
      req("/servers/server-a/chat", {
        method: "POST",
        body: { message: "psst", login: "p1" },
      }),
      onA(),
    );
    expect(mocks.send).toHaveBeenLastCalledWith(
      actor,
      "server-a",
      "psst",
      "p1",
    );
  });

  it("rejects an empty message", async () => {
    const res = await chatRoute.POST(
      req("/servers/server-a/chat", {
        method: "POST",
        body: { message: "  " },
      }),
      onA(),
    );
    expect(res.status).toBe(400);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("keeps reading and sending apart", async () => {
    mocks.authenticate.mockResolvedValue(principal(["chat:read"]));
    const res = await chatRoute.POST(
      req("/servers/server-a/chat", { method: "POST", body: { message: "x" } }),
      onA(),
    );
    expect(res.status).toBe(403);
  });
});
