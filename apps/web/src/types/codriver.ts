// Payloads of the Codriver API routes; keys never leave the server, only hints

export type CodriverModelName = "haiku" | "sonnet";

export interface CodriverRuleRow {
  id: string;
  targetType: "server" | "group" | "user";
  targetId: string;
  // Name of the server, group or user; null when it no longer exists
  targetName: string | null;
  effect: "allow" | "deny";
  useSharedKey: boolean;
  sharedMonthlyBudgetCents: number | null;
}

export interface CodriverPanelOverview {
  settings: {
    enabled: boolean;
    sharedKeyHint: string | null;
    sharedKeyModels: CodriverModelName[];
    sharedMonthlyBudgetCents: number | null;
    allowServerKeys: boolean;
    userMode: "everyone" | "allowlist";
    retentionDays: number;
  };
  // SECRETS_KEY is set, so keys can be stored
  canStoreKeys: boolean;
  // ANTHROPIC_API_KEY is set and used while no shared key is stored
  envKeyFallback: boolean;
  rules: CodriverRuleRow[];
  sharedSpentMicrosThisMonth: number;
}

export interface CodriverAccessCheck {
  role: "guest" | "member" | "moderator" | "admin";
  allowed: boolean;
  // Which layer refused, or which key would pay
  layer:
    | "panel"
    | "server-rule"
    | "user-rule"
    | "server-settings"
    | "key"
    | null;
  reason: string | null;
  keySource: "server" | "shared" | null;
  primaryModel: string | null;
  escalationModel: string | null;
}

export interface CodriverServerOverview {
  // The operator made Codriver available on this server
  available: boolean;
  allowServerKeys: boolean;
  sharedKeyAvailable: boolean;
  // Models the shared key may use; a server key may use both
  sharedKeyModels: CodriverModelName[];
  // The operator's monthly cap for shared-key use on this server
  sharedCapCents: number | null;
  settings: {
    enabled: boolean;
    keyHint: string | null;
    model: CodriverModelName;
    escalation: boolean;
    monthlyBudgetCents: number | null;
    guestAccess: "off" | "read";
    memberAccess: boolean;
    cooldownSeconds: number;
    memoryTurns: number;
  };
  spentMicrosThisMonth: { serverKey: number; shared: number };
}

export interface CodriverRequestRow {
  id: string;
  serverId: string;
  serverName: string;
  modelCalls: number | null;
  login: string;
  userName: string | null;
  source: "game" | "panel" | "cli";
  text: string;
  reply: string | null;
  feedback: string | null;
  feedbackAt: Date | null;
  toolCalls: unknown;
  status: string;
  keySource: "server" | "shared" | "none";
  model: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  costMicros: number;
  latencyMs: number;
  createdAt: Date;
}

export const codriverStatuses = [
  "done",
  "needs_confirmation",
  "planned",
  "unclear",
  "denied",
  "failed",
  "over_budget",
] as const;
export type CodriverRequestStatus = (typeof codriverStatuses)[number];
export interface CodriverChatReply {
  confirmationId?: string;
  status: CodriverRequestStatus | "cooldown";
  reply: string;
}
export interface CodriverChatAccess {
  allowed: boolean;
  reason: string | null;
}
export interface CodriverUsageBucket {
  id: string;
  name: string;
  requests: number;
  costMicros: number;
}
export interface CodriverUsage {
  month: string;
  requests: number;
  costMicros: number;
  failed: number;
  modelRequests: number;
  escalated: number;
  untrackedModelRequests: number;
  daily: { date: string; requests: number; costMicros: number }[];
  tools: { name: string; requests: number }[];
  byKey: CodriverUsageBucket[];
  byServer: CodriverUsageBucket[];
  byGroup: CodriverUsageBucket[];
}
