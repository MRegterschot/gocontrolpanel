"use server";

import { logAudit } from "@/actions/database/server-only/audit-logs";
import { doServerActionWithAuth } from "@/lib/actions";
import { actorFromSession } from "@/lib/actor";
import { availability, resolveAccess } from "@/lib/codriver/access";
import { clearTurns } from "@/lib/codriver/conversation";
import { createAnthropicModel, verifyApiKey } from "@/lib/codriver/model";
import {
  codriverChatPermissions,
  panelChatActor,
} from "@/lib/codriver/panel-access";
import { runPanelChat } from "@/lib/codriver/panel-chat";
import { resolveRole } from "@/lib/codriver/roles";
import { runCodriver } from "@/lib/codriver/runner";
import {
  loadAccessInput,
  loadPanelSettings,
  loadRules,
  PANEL_SETTINGS_ID,
} from "@/lib/codriver/settings";
import { recordRequest } from "@/lib/codriver/usage";
import { getClient } from "@/lib/dbclient";
import { encryptSecret } from "@/lib/secrets";
import { requirePanelAdmin, serverAdminPermissions } from "@/services/codriver";
import type { CodriverChatReply } from "@/types/codriver";
import { ServerError, ServerResponse } from "@/types/responses";
import { z } from "zod";

const cents = z.number().int().min(0).max(100_000_000).nullable();
const modelName = z.enum(["haiku", "sonnet"]);

const panelSettingsSchema = z.object({
  enabled: z.boolean(),
  sharedKeyModels: z.array(modelName).min(1),
  sharedMonthlyBudgetCents: cents,
  allowServerKeys: z.boolean(),
  userMode: z.enum(["everyone", "allowlist"]),
  retentionDays: z.number().int().min(1).max(3650),
});

const ruleSchema = z.object({
  targetType: z.enum(["server", "group", "user"]),
  targetId: z.string().min(1).max(64),
  effect: z.enum(["allow", "deny"]),
  useSharedKey: z.boolean(),
  sharedMonthlyBudgetCents: cents,
});

const serverSettingsSchema = z.object({
  enabled: z.boolean(),
  model: modelName,
  escalation: z.boolean(),
  monthlyBudgetCents: cents,
  guestAccess: z.enum(["off", "read"]),
  memberAccess: z.boolean(),
  cooldownSeconds: z.number().int().min(0).max(300),
  memoryTurns: z.number().int().min(0).max(10),
});

// null removes the stored key
const apiKeySchema = z.string().trim().min(20).max(300).nullable();

function parse<S extends z.ZodTypeAny>(schema: S, value: unknown): z.output<S> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new ServerError(
      parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; "),
      "ValidationError",
    );
  }
  return parsed.data;
}

async function encryptVerifiedKey(key: string | null): Promise<string | null> {
  if (key === null) return null;
  const check = await verifyApiKey(key);
  if (!check.ok) throw new ServerError(check.reason, "InvalidApiKey");
  return encryptSecret(key);
}

// Operator settings ---------------------------------------------------------------------------

export async function saveCodriverPanelSettings(
  input: z.input<typeof panelSettingsSchema>,
): Promise<ServerResponse> {
  return doServerActionWithAuth([], async (session) => {
    requirePanelAdmin(session);
    const data = parse(panelSettingsSchema, input);
    await getClient().codriverPanelSettings.upsert({
      where: { id: PANEL_SETTINGS_ID },
      create: { id: PANEL_SETTINGS_ID, ...data },
      update: data,
    });
    await logAudit(
      session.user.id,
      PANEL_SETTINGS_ID,
      "codriver.panel.edit",
      data,
    );
  });
}

export async function setCodriverSharedKey(
  key: string | null,
): Promise<ServerResponse> {
  return doServerActionWithAuth([], async (session) => {
    requirePanelAdmin(session);
    const encrypted = await encryptVerifiedKey(parse(apiKeySchema, key));
    await getClient().codriverPanelSettings.upsert({
      where: { id: PANEL_SETTINGS_ID },
      create: { id: PANEL_SETTINGS_ID, sharedApiKeyEncrypted: encrypted },
      update: { sharedApiKeyEncrypted: encrypted },
    });
    await logAudit(
      session.user.id,
      PANEL_SETTINGS_ID,
      "codriver.sharedkey.edit",
      {
        removed: encrypted === null,
      },
    );
  });
}

async function targetExists(
  type: "server" | "group" | "user",
  id: string,
): Promise<boolean> {
  const db = getClient();
  switch (type) {
    case "server":
      return !!(await db.servers.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
      }));
    case "group":
      return !!(await db.groups.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
      }));
    case "user":
      return !!(await db.users.findUnique({
        where: { id },
        select: { id: true },
      }));
  }
}

// One rule per target; saving again replaces it
export async function saveCodriverRule(
  input: z.input<typeof ruleSchema>,
): Promise<ServerResponse> {
  return doServerActionWithAuth([], async (session) => {
    requirePanelAdmin(session);
    const rule = parse(ruleSchema, input);
    if (!(await targetExists(rule.targetType, rule.targetId))) {
      throw new ServerError(
        `That ${rule.targetType} does not exist`,
        "NotFound",
      );
    }
    // Shared-key settings mean nothing on a user rule
    const data =
      rule.targetType === "user"
        ? { ...rule, useSharedKey: false, sharedMonthlyBudgetCents: null }
        : rule;
    await getClient().codriverAccessRules.upsert({
      where: {
        targetType_targetId: {
          targetType: data.targetType,
          targetId: data.targetId,
        },
      },
      create: { ...data, createdById: session.user.id },
      update: data,
    });
    await logAudit(session.user.id, data.targetId, "codriver.rule.edit", data);
  });
}

export async function deleteCodriverRule(id: string): Promise<ServerResponse> {
  return doServerActionWithAuth([], async (session) => {
    requirePanelAdmin(session);
    const rule = await getClient().codriverAccessRules.delete({
      where: { id: parse(z.string().min(1), id) },
    });
    await logAudit(session.user.id, rule.targetId, "codriver.rule.delete", {
      targetType: rule.targetType,
    });
  });
}

// Server settings -----------------------------------------------------------------------------

// Server admins can only configure Codriver where the operator made it available
async function requireAvailable(serverId: string) {
  const [panel, rules] = await Promise.all([
    loadPanelSettings(),
    loadRules(serverId, null),
  ]);
  if (!panel?.enabled || !availability(rules.serverRule, rules.groupRules)) {
    throw new ServerError(
      "Codriver is not available on this server",
      "Unauthorized",
    );
  }
  return panel;
}

export async function saveCodriverServerSettings(
  serverId: string,
  input: z.input<typeof serverSettingsSchema>,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    serverAdminPermissions(serverId),
    async (session) => {
      await requireAvailable(serverId);
      const data = parse(serverSettingsSchema, input);
      await getClient().codriverSettings.upsert({
        where: { serverId },
        create: { serverId, ...data },
        update: data,
      });
      await logAudit(session.user.id, serverId, "server.codriver.edit", data);
    },
  );
}

export async function setCodriverServerKey(
  serverId: string,
  key: string | null,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    serverAdminPermissions(serverId),
    async (session) => {
      const panel = await requireAvailable(serverId);
      const parsed = parse(apiKeySchema, key);
      if (parsed !== null && !panel.allowServerKeys) {
        throw new ServerError(
          "This panel does not allow server API keys",
          "Unauthorized",
        );
      }
      const encrypted = await encryptVerifiedKey(parsed);
      await getClient().codriverSettings.upsert({
        where: { serverId },
        create: { serverId, apiKeyEncrypted: encrypted },
        update: { apiKeyEncrypted: encrypted },
      });
      await logAudit(session.user.id, serverId, "server.codriver.key.edit", {
        removed: encrypted === null,
      });
    },
  );
}

// Shows what a request would do, without running it; the model call counts toward the budget
export async function testCodriverRequest(
  serverId: string,
  text: string,
): Promise<ServerResponse<{ status: string; reply: string }>> {
  return doServerActionWithAuth(
    serverAdminPermissions(serverId),
    async (session) => {
      await requireAvailable(serverId);
      const request = parse(z.string().trim().min(1).max(300), text);
      const actor = actorFromSession(session);
      const role = resolveRole(actor, serverId);
      const input = await loadAccessInput(serverId, actor, role);
      // Testing works before the server switch is turned on
      const access = resolveAccess({
        ...input,
        server: input.server ? { ...input.server, enabled: true } : null,
      });
      if (!access.allowed) {
        return {
          status: "denied",
          reply: input.server ? access.reason : "Save the settings first.",
        };
      }

      const started = Date.now();
      const outcome = await runCodriver(
        { serverId, actor, text: request },
        {
          model: createAnthropicModel(access.apiKey),
          primaryModel: access.primaryModel,
          escalationModel: access.escalationModel,
          dryRun: true,
        },
      );
      await recordRequest({
        serverId,
        userId: actor.userId,
        login: actor.login,
        source: "panel",
        text: request,
        reply: outcome.reply,
        calls: outcome.calls,
        status: outcome.status,
        keySource: outcome.usage.length > 0 ? access.keySource : "none",
        usage: outcome.usage,
        latencyMs: Date.now() - started,
      });
      return { status: outcome.status, reply: outcome.reply };
    },
  );
}

export async function sendCodriverMessage(
  serverId: string,
  text: string,
  confirmationId?: string,
): Promise<ServerResponse<CodriverChatReply>> {
  return doServerActionWithAuth(
    codriverChatPermissions.map((permission) =>
      permission.replace(":id:", `:${serverId}:`),
    ),
    async (session) => {
      const request = parse(z.string().trim().min(1).max(300), text);
      const actor = await panelChatActor(session, serverId);
      return runPanelChat(actor, serverId, {
        text: request,
        confirmationId: parse(z.string().uuid().optional(), confirmationId),
      });
    },
  );
}

// Forgets what Codriver remembers of the caller's panel conversation
export async function clearCodriverConversation(
  serverId: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    codriverChatPermissions.map((permission) =>
      permission.replace(":id:", `:${serverId}:`),
    ),
    async (session) => {
      const actor = await panelChatActor(session, serverId);
      await clearTurns(serverId, actor.login, "panel");
    },
  );
}
