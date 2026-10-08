import { CODRIVER_MODELS } from "./model";
import type { CodriverRole } from "./types";

// Who may use Codriver where, and which key pays. Pure, so every rule is unit tested; the
// database side is in settings.ts. See section 5.1 of docs/codriver-plan.md.

export type CodriverModelName = keyof typeof CODRIVER_MODELS;

export interface PanelSettingsView {
  enabled: boolean;
  // Decrypted; null when none is stored
  sharedApiKey: string | null;
  sharedKeyModels: CodriverModelName[];
  sharedMonthlyBudgetCents: number | null;
  allowServerKeys: boolean;
  userMode: "everyone" | "allowlist";
}

export interface RuleView {
  effect: "allow" | "deny";
  useSharedKey: boolean;
  sharedMonthlyBudgetCents: number | null;
}

export interface ServerSettingsView {
  enabled: boolean;
  apiKey: string | null;
  model: CodriverModelName;
  escalation: boolean;
  monthlyBudgetCents: number | null;
  guestAccess: "off" | "read";
  memberAccess: boolean;
  cooldownSeconds: number;
}

export interface AccessInput {
  panel: PanelSettingsView | null;
  serverRule: RuleView | null;
  // Rules of the groups the server belongs to
  groupRules: RuleView[];
  // null for players without a panel account
  userRule: RuleView | null;
  server: ServerSettingsView | null;
  role: CodriverRole;
  // ANTHROPIC_API_KEY, the development fallback for the shared key
  envApiKey: string;
}

export type BudgetScope = "server-key" | "shared-server" | "shared-global";

export interface Budget {
  scope: BudgetScope;
  limitCents: number;
}

export type AccessLayer =
  | "panel"
  | "server-rule"
  | "user-rule"
  | "server-settings"
  | "key";

export type AccessDecision =
  | {
      allowed: true;
      keySource: "server" | "shared";
      apiKey: string;
      primaryModel: string;
      escalationModel: string | null;
      budgets: Budget[];
      cooldownSeconds: number;
    }
  | { allowed: false; layer: AccessLayer; reason: string };

const notOnServer = "Codriver is not enabled on this server.";
const noAccess = "You don't have access to Codriver on this server.";

function deny(layer: AccessLayer, reason: string): AccessDecision {
  return { allowed: false, layer, reason };
}

// The rule that makes Codriver available on the server: its own rule, else its groups' rules,
// where any deny wins. Returns null when the server is not available.
export function availability(
  serverRule: RuleView | null,
  groupRules: RuleView[],
): { useSharedKey: boolean; capCents: number | null } | null {
  if (serverRule) {
    if (serverRule.effect === "deny") return null;
    return {
      useSharedKey: serverRule.useSharedKey,
      capCents: serverRule.sharedMonthlyBudgetCents,
    };
  }
  if (
    groupRules.length === 0 ||
    groupRules.some((rule) => rule.effect === "deny")
  ) {
    return null;
  }
  const sharing = groupRules.filter((rule) => rule.useSharedKey);
  const caps = sharing
    .map((rule) => rule.sharedMonthlyBudgetCents)
    .filter((cap): cap is number => cap !== null);
  return {
    useSharedKey: sharing.length > 0,
    capCents: caps.length > 0 ? Math.min(...caps) : null,
  };
}

export function resolveAccess(input: AccessInput): AccessDecision {
  const { panel, server, role } = input;

  if (!panel?.enabled)
    return deny("panel", "Codriver is not enabled on this panel.");

  const available = availability(input.serverRule, input.groupRules);
  if (!available) return deny("server-rule", notOnServer);

  if (input.userRule?.effect === "deny") return deny("user-rule", noAccess);
  if (panel.userMode === "allowlist" && input.userRule?.effect !== "allow") {
    return deny("user-rule", noAccess);
  }

  if (!server?.enabled) return deny("server-settings", notOnServer);
  if (role === "guest" && server.guestAccess === "off")
    return deny("server-settings", noAccess);
  if (role === "member" && !server.memberAccess)
    return deny("server-settings", noAccess);

  let keySource: "server" | "shared";
  let apiKey: string;
  let models: CodriverModelName[];
  let budgets: Budget[];
  if (panel.allowServerKeys && server.apiKey) {
    keySource = "server";
    apiKey = server.apiKey;
    models = ["haiku", "sonnet"];
    budgets =
      server.monthlyBudgetCents === null
        ? []
        : [{ scope: "server-key", limitCents: server.monthlyBudgetCents }];
  } else {
    const shared = panel.sharedApiKey ?? (input.envApiKey || null);
    if (!available.useSharedKey || !shared) {
      return deny("key", "Codriver has no API key on this server.");
    }
    keySource = "shared";
    apiKey = shared;
    models =
      panel.sharedKeyModels.length > 0 ? panel.sharedKeyModels : ["haiku"];
    budgets = [];
    if (available.capCents !== null) {
      budgets.push({ scope: "shared-server", limitCents: available.capCents });
    }
    if (panel.sharedMonthlyBudgetCents !== null) {
      budgets.push({
        scope: "shared-global",
        limitCents: panel.sharedMonthlyBudgetCents,
      });
    }
  }

  const primary = models.includes(server.model) ? server.model : models[0];
  const escalate =
    server.escalation && primary === "haiku" && models.includes("sonnet");

  return {
    allowed: true,
    keySource,
    apiKey,
    primaryModel: CODRIVER_MODELS[primary],
    escalationModel: escalate ? CODRIVER_MODELS.sonnet : null,
    budgets,
    cooldownSeconds: server.cooldownSeconds,
  };
}
