import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  config: { SECRETS_KEY: "s".repeat(32) },
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/config", () => ({ default: mocks.config }));
vi.mock("@/lib/dbclient", () => ({ getClient: () => ({}) }));
vi.mock("@/lib/logger", () => ({ getLogger: () => ({ warn: vi.fn() }) }));

import {
  type AccessInput,
  type PanelSettingsView,
  type RuleView,
  type ServerSettingsView,
  resolveAccess,
} from "@/lib/codriver/access";
import {
  costMicros,
  isSpent,
  monthStart,
  pruneCutoff,
} from "@/lib/codriver/usage";
import {
  canStoreSecrets,
  decryptSecret,
  encryptSecret,
  secretHint,
} from "@/lib/secrets";

const panel: PanelSettingsView = {
  enabled: true,
  sharedApiKey: "shared-key",
  sharedKeyModels: ["haiku"],
  sharedMonthlyBudgetCents: 2000,
  allowServerKeys: false,
  userMode: "everyone",
};
const allow: RuleView = {
  effect: "allow",
  useSharedKey: true,
  sharedMonthlyBudgetCents: 500,
};
const deny: RuleView = {
  effect: "deny",
  useSharedKey: false,
  sharedMonthlyBudgetCents: null,
};
const server: ServerSettingsView = {
  enabled: true,
  apiKey: null,
  model: "haiku",
  escalation: true,
  monthlyBudgetCents: null,
  guestAccess: "off",
  memberAccess: false,
  cooldownSeconds: 3,
  memoryTurns: 6,
};

function input(overrides: Partial<AccessInput> = {}): AccessInput {
  return {
    panel,
    serverRule: allow,
    groupRules: [],
    userRule: null,
    server,
    role: "moderator",
    envApiKey: "",
    ...overrides,
  };
}

function layer(overrides: Partial<AccessInput>) {
  const decision = resolveAccess(input(overrides));
  return decision.allowed ? "allowed" : decision.layer;
}

describe("resolveAccess: who may use Codriver", () => {
  it.each<[string, Partial<AccessInput>, string]>([
    ["allowed with defaults", {}, "allowed"],
    ["no panel settings", { panel: null }, "panel"],
    ["master switch off", { panel: { ...panel, enabled: false } }, "panel"],
    [
      "no rule for the server or its groups",
      { serverRule: null },
      "server-rule",
    ],
    ["server rule denies", { serverRule: deny }, "server-rule"],
    [
      "group allows the server",
      { serverRule: null, groupRules: [allow] },
      "allowed",
    ],
    [
      "any group deny beats a group allow",
      { serverRule: null, groupRules: [allow, deny] },
      "server-rule",
    ],
    [
      "server rule beats a group deny",
      { serverRule: allow, groupRules: [deny] },
      "allowed",
    ],
    [
      "server deny beats a group allow",
      { serverRule: deny, groupRules: [allow] },
      "server-rule",
    ],
    ["user rule denies", { userRule: deny }, "user-rule"],
    [
      "allowlist without a user rule",
      { panel: { ...panel, userMode: "allowlist" } },
      "user-rule",
    ],
    [
      "allowlist with a user allow",
      { panel: { ...panel, userMode: "allowlist" }, userRule: allow },
      "allowed",
    ],
    [
      "allowlist refuses guests",
      { panel: { ...panel, userMode: "allowlist" }, role: "guest" },
      "user-rule",
    ],
    ["server admin has not turned it on", { server: null }, "server-settings"],
    [
      "server switch off",
      { server: { ...server, enabled: false } },
      "server-settings",
    ],
    ["guests are off by default", { role: "guest" }, "server-settings"],
    [
      "guests with read access",
      { role: "guest", server: { ...server, guestAccess: "read" } },
      "allowed",
    ],
    ["members are off by default", { role: "member" }, "server-settings"],
    [
      "members when allowed",
      { role: "member", server: { ...server, memberAccess: true } },
      "allowed",
    ],
    ["admins need no extra setting", { role: "admin" }, "allowed"],
  ])("%s", (_, overrides, expected) => {
    expect(layer(overrides)).toBe(expected);
  });

  it("does not let group membership of users matter", () => {
    // Group rules only arrive for the server's groups; a user in a denied group is not affected
    expect(layer({ serverRule: allow, groupRules: [] })).toBe("allowed");
  });
});

describe("resolveAccess: which key pays", () => {
  it("uses the shared key with the per-server and global budgets", () => {
    const decision = resolveAccess(input());
    expect(decision).toMatchObject({
      allowed: true,
      keySource: "shared",
      apiKey: "shared-key",
      budgets: [
        { scope: "shared-server", limitCents: 500 },
        { scope: "shared-global", limitCents: 2000 },
      ],
    });
  });

  it("refuses when the rule does not allow the shared key", () => {
    expect(layer({ serverRule: { ...allow, useSharedKey: false } })).toBe(
      "key",
    );
  });

  it("falls back to the environment key when the operator stored none", () => {
    const decision = resolveAccess(
      input({ panel: { ...panel, sharedApiKey: null }, envApiKey: "env-key" }),
    );
    expect(decision).toMatchObject({ allowed: true, apiKey: "env-key" });
    expect(layer({ panel: { ...panel, sharedApiKey: null } })).toBe("key");
  });

  it("uses the server's own key only when the operator allows server keys", () => {
    const withKey = {
      ...server,
      apiKey: "server-key",
      monthlyBudgetCents: 300,
    };
    expect(resolveAccess(input({ server: withKey }))).toMatchObject({
      keySource: "shared",
    });
    expect(
      resolveAccess(
        input({ server: withKey, panel: { ...panel, allowServerKeys: true } }),
      ),
    ).toMatchObject({
      keySource: "server",
      apiKey: "server-key",
      budgets: [{ scope: "server-key", limitCents: 300 }],
    });
  });

  it("uses the tightest per-server cap of the sharing groups", () => {
    const decision = resolveAccess(
      input({
        serverRule: null,
        groupRules: [
          allow,
          { ...allow, sharedMonthlyBudgetCents: 200 },
          { ...allow, useSharedKey: false },
        ],
      }),
    );
    expect(decision).toMatchObject({
      budgets: expect.arrayContaining([
        { scope: "shared-server", limitCents: 200 },
      ]),
    });
  });

  it("limits shared-key models to the operator's list", () => {
    const sonnet = { ...server, model: "sonnet" as const };
    expect(resolveAccess(input({ server: sonnet }))).toMatchObject({
      primaryModel: "claude-haiku-5-5",
      escalationModel: null,
    });
    expect(
      resolveAccess(
        input({ panel: { ...panel, sharedKeyModels: ["haiku", "sonnet"] } }),
      ),
    ).toMatchObject({
      primaryModel: "claude-haiku-5-5",
      escalationModel: "claude-sonnet-5-5",
    });
  });

  it("lets server keys use either model and skip escalation when turned off", () => {
    expect(
      resolveAccess(
        input({
          panel: { ...panel, allowServerKeys: true },
          server: {
            ...server,
            apiKey: "k",
            model: "sonnet",
            escalation: false,
          },
        }),
      ),
    ).toMatchObject({
      primaryModel: "claude-sonnet-5-5",
      escalationModel: null,
    });
  });
});

describe("usage", () => {
  it("prices requests in micro-dollars", () => {
    expect(
      costMicros([
        {
          model: "claude-haiku-5-5",
          inputTokens: 1500,
          outputTokens: 150,
          cacheReadTokens: 0,
        },
        {
          model: "claude-sonnet-5-5",
          inputTokens: 1000,
          outputTokens: 100,
          cacheReadTokens: 100,
        },
      ]),
    ).toBe(Math.round(150 + 75 + 2000 + 1000 + 20));
  });

  it("treats a budget as spent at its limit", () => {
    const budget = { scope: "shared-global" as const, limitCents: 1 };
    expect(isSpent({ budget, spentMicros: 9_999 })).toBe(false);
    expect(isSpent({ budget, spentMicros: 10_000 })).toBe(true);
  });

  it("never prunes this month's requests", () => {
    const now = new Date("2026-10-20T12:00:00Z");
    expect(pruneCutoff(7, now).toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(pruneCutoff(90, now).toISOString()).toBe("2026-07-22T12:00:00.000Z");
  });

  it("counts months in UTC", () => {
    expect(
      monthStart(new Date("2026-10-31T23:30:00-05:00")).toISOString(),
    ).toBe("2026-11-01T00:00:00.000Z");
  });
});

describe("secrets", () => {
  it("round-trips and never stores the plain key", () => {
    const stored = encryptSecret("sk-ant-api03-abcdef");
    expect(stored).not.toContain("abcdef");
    expect(decryptSecret(stored)).toBe("sk-ant-api03-abcdef");
    expect(encryptSecret("x")).not.toBe(encryptSecret("x"));
  });

  it("fails loudly on tampered values and a changed key", () => {
    const stored = encryptSecret("secret");
    expect(() => decryptSecret(stored.slice(0, -4) + "AAAA")).toThrow();
    expect(() => decryptSecret("plain-text")).toThrow();
    mocks.config.SECRETS_KEY = "t".repeat(32);
    expect(() => decryptSecret(stored)).toThrow();
    mocks.config.SECRETS_KEY = "s".repeat(32);
  });

  it("refuses to store keys without a strong SECRETS_KEY", () => {
    mocks.config.SECRETS_KEY = "short";
    expect(canStoreSecrets()).toBe(false);
    expect(() => encryptSecret("x")).toThrow();
    mocks.config.SECRETS_KEY = "s".repeat(32);
  });

  it("shows only the start and end of a key", () => {
    expect(secretHint("sk-ant-api03-abcdefghij-wxyz")).toBe("sk-ant-…wxyz");
  });
});
