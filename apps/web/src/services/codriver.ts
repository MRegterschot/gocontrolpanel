import { doServerActionWithAuth } from "@/lib/actions";
import { actorForLogin } from "@/lib/actor";
import { availability, resolveAccess } from "@/lib/codriver/access";
import {
  codriverChatPermissions,
  panelChatActor,
  requireActiveServer,
} from "@/lib/codriver/panel-access";
import { resolveRole } from "@/lib/codriver/roles";
import {
  loadAccessInput,
  loadPanelSettings,
  loadRules,
  loadServerSettings,
} from "@/lib/codriver/settings";
import { spentMicros } from "@/lib/codriver/usage";
import config from "@/lib/config";
import { getClient } from "@/lib/dbclient";
import { canStoreSecrets, secretHint } from "@/lib/secrets";
import type {
  CodriverAccessCheck,
  CodriverChatAccess,
  CodriverPanelOverview,
  CodriverRequestRow,
  CodriverRequestStatus,
  CodriverRuleRow,
  CodriverServerOverview,
} from "@/types/codriver";
import {
  PaginationResponse,
  ServerError,
  ServerResponse,
} from "@/types/responses";
import type { Prisma } from "@gcp/db";
import { PaginationState } from "@tanstack/react-table";
import type { Session } from "next-auth";
import "server-only";

// Operator settings belong to panel admins only
export function requirePanelAdmin(session: Session): void {
  if (!session.user.admin)
    throw new ServerError("Unauthorized", "Unauthorized");
}

export const serverAdminPermissions = (serverId: string) => [
  `servers:${serverId}:admin`,
  `group:servers:${serverId}:admin`,
];

async function ruleRows(): Promise<CodriverRuleRow[]> {
  const db = getClient();
  const rules = await db.codriverAccessRules.findMany({
    orderBy: [{ targetType: "asc" }, { createdAt: "asc" }],
  });
  const ids = (type: string) =>
    rules
      .filter((rule) => rule.targetType === type)
      .map((rule) => rule.targetId);
  const [servers, groups, users] = await Promise.all([
    db.servers.findMany({
      where: { id: { in: ids("server") }, deletedAt: null },
      select: { id: true, name: true },
    }),
    db.groups.findMany({
      where: { id: { in: ids("group") }, deletedAt: null },
      select: { id: true, name: true },
    }),
    db.users.findMany({
      where: { id: { in: ids("user") } },
      select: { id: true, nickName: true },
    }),
  ]);
  const names = new Map<string, string>([
    ...servers.map((s) => [`server:${s.id}`, s.name] as const),
    ...groups.map((g) => [`group:${g.id}`, g.name] as const),
    ...users.map((u) => [`user:${u.id}`, u.nickName] as const),
  ]);
  return rules.map((rule) => ({
    id: rule.id,
    targetType: rule.targetType,
    targetId: rule.targetId,
    targetName: names.get(`${rule.targetType}:${rule.targetId}`) ?? null,
    effect: rule.effect,
    useSharedKey: rule.useSharedKey,
    sharedMonthlyBudgetCents: rule.sharedMonthlyBudgetCents,
  }));
}

export async function getCodriverPanelOverview(): Promise<
  ServerResponse<CodriverPanelOverview>
> {
  return doServerActionWithAuth([], async (session) => {
    requirePanelAdmin(session);
    const panel = await loadPanelSettings();
    return {
      settings: {
        enabled: panel?.enabled ?? false,
        sharedKeyHint: panel?.sharedApiKey
          ? secretHint(panel.sharedApiKey)
          : null,
        sharedKeyModels: panel?.sharedKeyModels ?? ["haiku"],
        sharedMonthlyBudgetCents: panel?.sharedMonthlyBudgetCents ?? null,
        allowServerKeys: panel?.allowServerKeys ?? false,
        userMode: panel?.userMode ?? "everyone",
        retentionDays: panel?.retentionDays ?? 90,
      },
      canStoreKeys: canStoreSecrets(),
      envKeyFallback: !!config.CODRIVER.API_KEY,
      rules: await ruleRows(),
      sharedSpentMicrosThisMonth: await spentMicros("shared-global", ""),
    };
  });
}

// What Codriver would decide for this player on this server, and which layer decides it
export async function checkCodriverAccess(
  serverId: string,
  login: string,
): Promise<ServerResponse<CodriverAccessCheck>> {
  return doServerActionWithAuth([], async (session) => {
    requirePanelAdmin(session);
    const actor = await actorForLogin(login);
    const role = resolveRole(actor, serverId);
    const decision = resolveAccess(
      await loadAccessInput(serverId, actor, role),
    );
    return decision.allowed
      ? {
          role,
          allowed: true,
          layer: null,
          reason: null,
          keySource: decision.keySource,
          primaryModel: decision.primaryModel,
          escalationModel: decision.escalationModel,
        }
      : {
          role,
          allowed: false,
          layer: decision.layer,
          reason: decision.reason,
          keySource: null,
          primaryModel: null,
          escalationModel: null,
        };
  });
}

export async function getCodriverServerOverview(
  serverId: string,
): Promise<ServerResponse<CodriverServerOverview>> {
  return doServerActionWithAuth(serverAdminPermissions(serverId), async () => {
    const [panel, rules] = await Promise.all([
      loadPanelSettings(),
      loadRules(serverId, null),
    ]);
    const available = panel?.enabled
      ? availability(rules.serverRule, rules.groupRules)
      : null;
    const server = await loadServerSettings(serverId);
    return {
      available: !!available,
      allowServerKeys: panel?.allowServerKeys ?? false,
      sharedKeyAvailable:
        !!available?.useSharedKey &&
        !!(panel?.sharedApiKey ?? config.CODRIVER.API_KEY),
      sharedKeyModels: panel?.sharedKeyModels ?? ["haiku"],
      sharedCapCents: available?.capCents ?? null,
      settings: {
        enabled: server?.enabled ?? false,
        keyHint: server?.apiKey ? secretHint(server.apiKey) : null,
        model: server?.model ?? "haiku",
        escalation: server?.escalation ?? true,
        monthlyBudgetCents: server?.monthlyBudgetCents ?? null,
        guestAccess: server?.guestAccess ?? "off",
        memberAccess: server?.memberAccess ?? false,
        cooldownSeconds: server?.cooldownSeconds ?? 3,
      },
      spentMicrosThisMonth: {
        serverKey: await spentMicros("server-key", serverId),
        shared: await spentMicros("shared-server", serverId),
      },
    };
  });
}

const sortable = new Set([
  "createdAt",
  "status",
  "login",
  "costMicros",
  "latencyMs",
]);

export async function getCodriverRequestsPaginated(
  pagination: PaginationState,
  sorting: { field: string; order: "asc" | "desc" },
  filter: string,
  fetchArgs?: {
    serverId: string;
    status?: CodriverRequestStatus;
    login?: string;
  },
): Promise<ServerResponse<PaginationResponse<CodriverRequestRow>>> {
  const serverId = fetchArgs?.serverId ?? "";
  return doServerActionWithAuth(serverAdminPermissions(serverId), async () => {
    await requireActiveServer(serverId);
    return readRequests(pagination, sorting, filter, fetchArgs);
  });
}

export async function getCodriverPanelRequestsPaginated(
  pagination: PaginationState,
  sorting: { field: string; order: "asc" | "desc" },
  filter: string,
  filters?: { status?: CodriverRequestStatus; login?: string },
): Promise<ServerResponse<PaginationResponse<CodriverRequestRow>>> {
  return doServerActionWithAuth([], async (session) => {
    requirePanelAdmin(session);
    return readRequests(pagination, sorting, filter, filters);
  });
}

async function readRequests(
  pagination: PaginationState,
  sorting: { field: string; order: "asc" | "desc" },
  filter: string,
  filters?: {
    serverId?: string;
    status?: CodriverRequestStatus;
    login?: string;
  },
): Promise<PaginationResponse<CodriverRequestRow>> {
  const db = getClient();
  const where: Prisma.CodriverRequestsWhereInput = {
    server: { deletedAt: null },
    ...(filters?.serverId ? { serverId: filters.serverId } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
  };
  if (filters?.login) where.login = { contains: filters.login };
  if (filter) {
    where.OR = [
      { login: { contains: filter } },
      { text: { contains: filter } },
    ];
  }
  const [rows, totalCount] = await Promise.all([
    db.codriverRequests.findMany({
      where,
      orderBy: [
        {
          [sortable.has(sorting.field) ? sorting.field : "createdAt"]:
            sorting.order,
        },
        { id: "desc" },
      ],
      skip: pagination.pageIndex * pagination.pageSize,
      take: pagination.pageSize,
      include: {
        user: { select: { nickName: true } },
        server: { select: { name: true } },
      },
    }),
    db.codriverRequests.count({ where }),
  ]);
  return {
    totalCount,
    data: rows.map((row) => ({
      id: row.id,
      serverId: row.serverId,
      serverName: row.server.name,
      modelCalls: row.modelCalls,
      login: row.login,
      userName: row.user?.nickName ?? null,
      source: row.source,
      text: row.text,
      toolCalls: row.toolCalls,
      status: row.status,
      keySource: row.keySource,
      model: row.model,
      costMicros: row.costMicros,
      latencyMs: row.latencyMs,
      createdAt: row.createdAt,
    })),
  };
}

export async function getCodriverChatAccess(
  serverId: string,
): Promise<ServerResponse<CodriverChatAccess>> {
  return doServerActionWithAuth(
    codriverChatPermissions.map((permission) =>
      permission.replace(":id:", `:${serverId}:`),
    ),
    async (session) => {
      const actor = await panelChatActor(session, serverId);
      const decision = resolveAccess(
        await loadAccessInput(serverId, actor, resolveRole(actor, serverId)),
      );
      return {
        allowed: decision.allowed,
        reason: decision.allowed ? null : decision.reason,
      };
    },
  );
}
