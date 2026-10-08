import type { Actor } from "@/lib/actor";
import config from "@/lib/config";
import { getClient } from "@/lib/dbclient";
import { getLogger } from "@/lib/logger";
import { decryptSecret } from "@/lib/secrets";
import { getList } from "@/lib/utils";
import "server-only";
import type {
  AccessInput,
  CodriverModelName,
  PanelSettingsView,
  RuleView,
  ServerSettingsView,
} from "./access";
import type { CodriverRole } from "./types";

export const PANEL_SETTINGS_ID = "panel";

// A stored key that can't be decrypted counts as missing; the operator sees it in the log
function decryptOrNull(stored: string | null, what: string): string | null {
  if (!stored) return null;
  try {
    return decryptSecret(stored);
  } catch (error) {
    getLogger("codriver").error(
      { error },
      `Codriver ${what} could not be decrypted`,
    );
    return null;
  }
}

function toRule(rule: {
  effect: "allow" | "deny";
  useSharedKey: boolean;
  sharedMonthlyBudgetCents: number | null;
}): RuleView {
  return {
    effect: rule.effect,
    useSharedKey: rule.useSharedKey,
    sharedMonthlyBudgetCents: rule.sharedMonthlyBudgetCents,
  };
}

export async function loadPanelSettings(): Promise<
  (PanelSettingsView & { retentionDays: number }) | null
> {
  const row = await getClient().codriverPanelSettings.findUnique({
    where: { id: PANEL_SETTINGS_ID },
  });
  if (!row) return null;
  return {
    enabled: row.enabled,
    sharedApiKey: decryptOrNull(row.sharedApiKeyEncrypted, "shared key"),
    sharedKeyModels: getList<CodriverModelName>(row.sharedKeyModels),
    sharedMonthlyBudgetCents: row.sharedMonthlyBudgetCents,
    allowServerKeys: row.allowServerKeys,
    userMode: row.userMode,
    retentionDays: row.retentionDays,
  };
}

export async function loadServerSettings(
  serverId: string,
): Promise<ServerSettingsView | null> {
  const row = await getClient().codriverSettings.findUnique({
    where: { serverId },
  });
  if (!row) return null;
  return {
    enabled: row.enabled,
    apiKey: decryptOrNull(row.apiKeyEncrypted, "server key"),
    model: row.model,
    escalation: row.escalation,
    monthlyBudgetCents: row.monthlyBudgetCents,
    guestAccess: row.guestAccess,
    memberAccess: row.memberAccess,
    cooldownSeconds: row.cooldownSeconds,
  };
}

// The operator's rules that apply to a server, and to a user when given
export async function loadRules(
  serverId: string,
  userId: string | null,
): Promise<Pick<AccessInput, "serverRule" | "groupRules" | "userRule">> {
  const db = getClient();
  const groupIds = (
    await db.groupServers.findMany({
      where: { serverId, group: { deletedAt: null } },
      select: { groupId: true },
    })
  ).map((row) => row.groupId);

  const rules = await db.codriverAccessRules.findMany({
    where: {
      OR: [
        { targetType: "server", targetId: serverId },
        ...(groupIds.length
          ? [{ targetType: "group" as const, targetId: { in: groupIds } }]
          : []),
        ...(userId ? [{ targetType: "user" as const, targetId: userId }] : []),
      ],
    },
  });

  const serverRule = rules.find((rule) => rule.targetType === "server");
  const userRule = rules.find((rule) => rule.targetType === "user");
  return {
    serverRule: serverRule ? toRule(serverRule) : null,
    groupRules: rules.filter((rule) => rule.targetType === "group").map(toRule),
    userRule: userRule ? toRule(userRule) : null,
  };
}

// Everything resolveAccess needs for one caller on one server
export async function loadAccessInput(
  serverId: string,
  actor: Actor,
  role: CodriverRole,
): Promise<AccessInput & { retentionDays: number }> {
  const [panel, server, rules] = await Promise.all([
    loadPanelSettings(),
    loadServerSettings(serverId),
    loadRules(serverId, actor.userId),
  ]);
  return {
    panel,
    ...rules,
    server,
    role,
    envApiKey: config.CODRIVER.API_KEY,
    retentionDays: panel?.retentionDays ?? 90,
  };
}
