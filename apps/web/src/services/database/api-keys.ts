import { doServerActionWithAuth } from "@/lib/actions";
import { getClient } from "@/lib/dbclient";
import { assertResourceId } from "@/lib/resource-id";
import { PaginationResponse, ServerResponse } from "@/types/responses";
import { Prisma } from "@gcp/db";
import { type ApiKeyScope, parseApiKeyScopes } from "@gcp/shared";
import { PaginationState } from "@tanstack/react-table";
import "server-only";

export const apiKeyRowSelect = Prisma.validator<Prisma.ApiKeysSelect>()({
  id: true,
  name: true,
  prefix: true,
  scopes: true,
  serverId: true,
  groupId: true,
  expiresAt: true,
  lastUsedAt: true,
  revokedAt: true,
  createdAt: true,
  server: { select: { id: true, name: true } },
  group: { select: { id: true, name: true } },
  createdBy: { select: { id: true, login: true, nickName: true } },
});

type ApiKeyRecord = Prisma.ApiKeysGetPayload<{
  select: typeof apiKeyRowSelect;
}>;

// A key as the panel shows it; the token itself is never readable after creation
export interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  scopes: ApiKeyScope[];
  target: { type: "server" | "group"; id: string; name: string };
  createdBy: { id: string; login: string; nickName: string };
  createdAt: Date;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}

export function toApiKeyRow(key: ApiKeyRecord): ApiKeyRow {
  const target = key.group
    ? { type: "group" as const, id: key.group.id, name: key.group.name }
    : {
        type: "server" as const,
        id: key.server?.id ?? key.serverId ?? "",
        name: key.server?.name ?? "",
      };
  return {
    id: key.id,
    name: key.name,
    prefix: key.prefix,
    scopes: parseApiKeyScopes(key.scopes),
    target,
    createdBy: key.createdBy,
    createdAt: key.createdAt,
    expiresAt: key.expiresAt,
    lastUsedAt: key.lastUsedAt,
    revokedAt: key.revokedAt,
  };
}

const newestFirst = [{ createdAt: "desc" as const }, { id: "asc" as const }];

// A server's own keys, and the group keys that can reach it, for its admins
export async function getServerApiKeys(
  serverId: string,
): Promise<ServerResponse<{ own: ApiKeyRow[]; viaGroups: ApiKeyRow[] }>> {
  assertResourceId(serverId);
  return doServerActionWithAuth(
    [`servers:${serverId}:admin`, `group:servers:${serverId}:admin`],
    async () => {
      const db = getClient();
      const [own, viaGroups] = await Promise.all([
        db.apiKeys.findMany({
          where: { serverId, deletedAt: null },
          select: apiKeyRowSelect,
          orderBy: newestFirst,
        }),
        db.apiKeys.findMany({
          where: {
            deletedAt: null,
            group: {
              deletedAt: null,
              groupServers: { some: { serverId } },
            },
          },
          select: apiKeyRowSelect,
          orderBy: newestFirst,
        }),
      ]);
      return {
        own: own.map(toApiKeyRow),
        viaGroups: viaGroups.map(toApiKeyRow),
      };
    },
  );
}

// A group's keys, for every admin of the group
export async function getGroupApiKeys(
  groupId: string,
): Promise<ServerResponse<ApiKeyRow[]>> {
  assertResourceId(groupId);
  return doServerActionWithAuth([`groups:${groupId}:admin`], async () => {
    const keys = await getClient().apiKeys.findMany({
      where: { groupId, deletedAt: null },
      select: apiKeyRowSelect,
      orderBy: newestFirst,
    });
    return keys.map(toApiKeyRow);
  });
}

// Sorting on these only; the field ends up in a Prisma orderBy
const SORTABLE = new Set(["name", "createdAt", "lastUsedAt", "expiresAt"]);

// Every key, for the admin overview
export async function getApiKeysPaginated(
  pagination: PaginationState,
  sorting: { field: string; order: "asc" | "desc" },
  filter: string,
): Promise<ServerResponse<PaginationResponse<ApiKeyRow>>> {
  return doServerActionWithAuth(
    ["api-keys:view", "api-keys:revoke"],
    async () => {
      const db = getClient();
      const where: Prisma.ApiKeysWhereInput = {
        deletedAt: null,
        ...(filter && {
          OR: [
            { name: { contains: filter } },
            { prefix: { contains: filter } },
            { server: { name: { contains: filter } } },
            { group: { name: { contains: filter } } },
          ],
        }),
      };
      const field = SORTABLE.has(sorting.field) ? sorting.field : "createdAt";
      const [keys, totalCount] = await Promise.all([
        db.apiKeys.findMany({
          where,
          select: apiKeyRowSelect,
          orderBy: [{ [field]: sorting.order }, { id: "asc" }],
          skip: pagination.pageIndex * pagination.pageSize,
          take: pagination.pageSize,
        }),
        db.apiKeys.count({ where }),
      ]);
      return { data: keys.map(toApiKeyRow), totalCount };
    },
  );
}
