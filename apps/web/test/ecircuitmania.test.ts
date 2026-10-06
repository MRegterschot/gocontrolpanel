import slugid from "slugid";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  plugin: vi.fn(),
  match: vi.fn(),
  post: vi.fn(),
  audit: vi.fn(),
  auth: vi.fn(),
}));
vi.mock("@/lib/actions", () => ({
  doServerActionWithAuth: async (
    roles: string[],
    action: (session: unknown) => Promise<unknown>,
  ) => {
    mocks.auth(roles);
    try {
      return { data: await action({ user: { id: "operator" } }) };
    } catch (error) {
      return { error: (error as Error).message };
    }
  },
}));
vi.mock("@/lib/dbclient", () => ({
  getClient: () => ({
    serverPlugins: { findFirst: mocks.plugin },
    matches: { findFirst: mocks.match },
  }),
}));
vi.mock("@/lib/axios/ecircuitmania", () => ({
  axiosECM: { post: mocks.post },
}));
vi.mock("@/actions/database/server-only/audit-logs", () => ({
  logAudit: mocks.audit,
}));

import {
  getEcmKeyStatus,
  sendRecordsToEcm,
} from "@/actions/database/ecircuitmania";

const loginA = slugid.encode("00000000-0000-4000-8000-000000000001");
const loginB = slugid.encode("00000000-0000-4000-8000-000000000002");
const loginC = slugid.encode("00000000-0000-4000-8000-000000000003");
const record = (id: string, login: string | null, time: number) => ({
  id,
  login,
  time,
});
const input = { apiKey: "", roundNumber: 8, recordIds: ["a", "b", "c", "d"] };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.plugin.mockResolvedValue({ config: { apiKey: "saved_token" } });
  mocks.match.mockResolvedValue({
    map: { uid: "map-uid" },
    records: [
      record("a", loginA, 42000),
      record("b", loginB, -1),
      record("c", loginC, 39000),
      record("d", loginA, 40000),
    ],
  });
  mocks.post.mockResolvedValue({ status: 200 });
});

describe("sending recorded rounds to ECM", () => {
  it("uses the saved key, ranks finishers before DNF, and keeps each player's best selected result", async () => {
    expect(await sendRecordsToEcm("server", "match", input)).toEqual({
      data: undefined,
    });
    expect(mocks.post).toHaveBeenCalledWith(
      "/match-addRound",
      {
        roundNum: 8,
        mapId: "map-uid",
        players: [
          { ubisoftUid: slugid.decode(loginC), finishTime: 39000, position: 1 },
          { ubisoftUid: slugid.decode(loginA), finishTime: 40000, position: 2 },
          { ubisoftUid: slugid.decode(loginB), finishTime: -1, position: 3 },
        ],
      },
      {
        params: { matchId: "saved" },
        headers: { Authorization: "token" },
        timeout: 15000,
      },
    );
    expect(mocks.match.mock.calls[0][0]).toMatchObject({
      where: { id: "match", serverId: "server", deletedAt: null },
      include: {
        records: {
          where: {
            id: { in: input.recordIds },
            serverId: "server",
            deletedAt: null,
          },
        },
      },
    });
    expect(mocks.auth).toHaveBeenCalledWith([
      "servers:server:moderator",
      "servers:server:admin",
      "group:servers:server:moderator",
      "group:servers:server:admin",
    ]);
    expect(JSON.stringify(mocks.audit.mock.calls)).not.toContain("token");
  });

  it("allows a key override without changing or reading plugin settings", async () => {
    await sendRecordsToEcm("server", "match", {
      ...input,
      apiKey: "override_other",
    });
    expect(mocks.plugin).not.toHaveBeenCalled();
    expect(mocks.post.mock.calls[0][2]).toMatchObject({
      params: { matchId: "override" },
      headers: { Authorization: "other" },
    });
  });

  it("returns only saved key availability", async () => {
    expect(await getEcmKeyStatus("server")).toEqual({ data: true });
    mocks.plugin.mockResolvedValue(null);
    expect(await getEcmKeyStatus("server")).toEqual({ data: false });
  });

  it.each([
    { ...input, recordIds: [] },
    { ...input, roundNumber: 0 },
    { ...input, roundNumber: 1.5 },
    { ...input, apiKey: "invalid" },
  ])("rejects invalid input before sending: %j", async (values) => {
    expect(
      (await sendRecordsToEcm("server", "match", values)).error,
    ).toBeDefined();
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("rejects IDs outside the match instead of sending a partial selection", async () => {
    expect(
      (
        await sendRecordsToEcm("server", "match", {
          ...input,
          recordIds: [...input.recordIds, "foreign"],
        })
      ).error,
    ).toContain("not found");
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("rejects records without a usable account ID", async () => {
    mocks.match.mockResolvedValue({
      map: { uid: "map-uid" },
      records: [record("a", null, 40000)],
    });
    expect(
      (
        await sendRecordsToEcm("server", "match", {
          ...input,
          recordIds: ["a"],
        })
      ).error,
    ).toContain("account ID");
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("reports a failed ECM request without exposing its request credentials", async () => {
    mocks.post.mockRejectedValue({
      isAxiosError: true,
      response: { status: 403 },
      config: { headers: { Authorization: "secret" } },
    });
    const response = await sendRecordsToEcm("server", "match", input);
    expect(response.error).toContain("403");
    expect(response.error).not.toContain("secret");
    expect(mocks.audit).not.toHaveBeenCalled();
  });
});
