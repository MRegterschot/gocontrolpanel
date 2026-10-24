import { type Actor, actorForLogin, actorHasPermission } from "@/lib/actor";
import { getClient } from "@/lib/dbclient";
import { logger } from "@/lib/logger";
import { ServerError } from "@/types/responses";
import {
  type ApiKeyScope,
  parseApiKeyScopes,
  serverPermissions,
  sessionClaimsSchema,
} from "@gcp/shared";
import "server-only";
import { bearerApiKeyToken, hashApiKeyToken } from "./token";

export const GROUP_ADMIN = ["groups:id:admin"] as const;

// How often lastUsedAt is written; a busy key would otherwise write on every request
const LAST_USED_INTERVAL_MS = 60_000;

export type ApiKeyTarget =
  | { type: "server"; serverId: string }
  | { type: "group"; groupId: string };

export interface ApiKeyServer {
  id: string;
  name: string;
  description: string;
}

export interface ApiKeyPrincipal {
  keyId: string;
  name: string;
  scopes: ApiKeyScope[];
  target: ApiKeyTarget;
  // What the key can reach right now: its server, or the group's current servers
  servers: ApiKeyServer[];
  actor: Actor;
}

function invalid(message: string): ServerError {
  return new ServerError(message, "InvalidApiKey");
}

// Exactly one target; a row with neither or both is never trusted
export function apiKeyTarget(key: {
  serverId: string | null;
  groupId: string | null;
}): ApiKeyTarget {
  if (key.serverId && !key.groupId) {
    return { type: "server", serverId: key.serverId };
  }
  if (key.groupId && !key.serverId) {
    return { type: "group", groupId: key.groupId };
  }
  throw invalid("Invalid API key");
}

// Whether someone may hold a key for this target: admin of it, or a panel admin
export function canManageApiKeysFor(
  actor: Actor,
  target: ApiKeyTarget,
): boolean {
  return target.type === "server"
    ? actorHasPermission(actor, serverPermissions.admin, target.serverId)
    : actorHasPermission(actor, GROUP_ADMIN, target.groupId);
}

// Claims for a key: only its target, never the creator's other roles or panel-admin flag
export function apiKeyClaims(
  creator: Actor,
  target: ApiKeyTarget,
  servers: ApiKeyServer[],
  groupName = "",
) {
  const summaries = servers.map(({ id, name }) => ({ id, name }));
  return sessionClaimsSchema.parse({
    id: creator.claims.id,
    login: creator.login,
    displayName: creator.displayName,
    admin: false,
    permissions: [],
    servers:
      target.type === "server"
        ? summaries.map((s) => ({ ...s, role: "Admin" }))
        : [],
    groups:
      target.type === "group"
        ? [
            {
              id: target.groupId,
              name: groupName,
              role: "Admin",
              servers: summaries,
            },
          ]
        : [],
    adminGroups: [],
    projects: [],
  });
}

async function touchLastUsed(
  id: string,
  lastUsedAt: Date | null,
  now: Date,
): Promise<void> {
  if (
    lastUsedAt &&
    now.getTime() - lastUsedAt.getTime() < LAST_USED_INTERVAL_MS
  )
    return;
  try {
    await getClient().apiKeys.update({
      where: { id },
      data: { lastUsedAt: now },
    });
  } catch (error) {
    // Bookkeeping only; never fail the request over it
    logger.warn(
      {
        meta: { type: "api", module: "api-keys", function: "touchLastUsed" },
        error,
      },
      "Could not update API key last use",
    );
  }
}

// Resolves an Authorization header to the key's narrowed actor, or throws InvalidApiKey
export async function authenticateApiKey(
  header: string | null,
  now = new Date(),
): Promise<ApiKeyPrincipal> {
  const token = bearerApiKeyToken(header);
  if (!token) throw invalid("Missing or malformed API key");

  const key = await getClient().apiKeys.findUnique({
    where: { hash: hashApiKeyToken(token) },
    select: {
      id: true,
      name: true,
      scopes: true,
      serverId: true,
      groupId: true,
      expiresAt: true,
      revokedAt: true,
      deletedAt: true,
      lastUsedAt: true,
      createdBy: { select: { login: true } },
      server: {
        select: { id: true, name: true, description: true, deletedAt: true },
      },
      group: {
        select: {
          id: true,
          name: true,
          deletedAt: true,
          groupServers: {
            where: { server: { deletedAt: null } },
            select: {
              server: { select: { id: true, name: true, description: true } },
            },
          },
        },
      },
    },
  });

  if (!key || key.deletedAt) throw invalid("Invalid API key");
  if (key.revokedAt) throw invalid("API key has been revoked");
  if (key.expiresAt && key.expiresAt <= now) {
    throw invalid("API key has expired");
  }

  const target = apiKeyTarget(key);
  let servers: ApiKeyServer[];
  if (target.type === "server") {
    if (!key.server || key.server.deletedAt) throw invalid("Invalid API key");
    const { id, name, description } = key.server;
    servers = [{ id, name, description }];
  } else {
    if (!key.group || key.group.deletedAt) throw invalid("Invalid API key");
    servers = key.group.groupServers.map((gs) => gs.server);
  }

  // Live roles: a demoted, removed or deleted creator's keys stop working
  const creator = await actorForLogin(key.createdBy.login);
  if (!canManageApiKeysFor(creator, target)) {
    throw invalid("API key is no longer valid");
  }

  await touchLastUsed(key.id, key.lastUsedAt, now);

  return {
    keyId: key.id,
    name: key.name,
    scopes: parseApiKeyScopes(key.scopes),
    target,
    servers,
    actor: {
      userId: creator.userId,
      login: creator.login,
      displayName: `${key.name} (API key)`,
      claims: apiKeyClaims(creator, target, servers, key.group?.name),
      apiKeyId: key.id,
    },
  };
}

export function hasApiKeyScope(
  principal: ApiKeyPrincipal,
  scope: ApiKeyScope,
): boolean {
  return principal.scopes.includes(scope);
}
