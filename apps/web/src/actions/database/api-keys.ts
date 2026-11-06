"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { actorFromSession } from "@/lib/actor";
import {
  type ApiKeyTarget,
  apiKeyTarget,
  canManageApiKeysFor,
} from "@/lib/api-keys/authenticate";
import { generateApiKeyToken } from "@/lib/api-keys/token";
import { getClient } from "@/lib/dbclient";
import { hasPermissionSync } from "@/lib/utils";
import {
  type ApiKeyRow,
  apiKeyRowSelect,
  toApiKeyRow,
} from "@/services/database/api-keys";
import { ServerError, ServerResponse } from "@/types/responses";
import { API_KEY_SCOPES } from "@tmcontrolpanel/shared";
import type { Session } from "next-auth";
import { z } from "zod";
import { withAudit } from "./server-only/audit-logs";

const resourceId = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
const keyName = z.string().trim().min(1).max(100);

const createSchema = z.object({
  target: z.discriminatedUnion("type", [
    z.object({ type: z.literal("server"), serverId: resourceId }),
    z.object({ type: z.literal("group"), groupId: resourceId }),
  ]),
  name: keyName,
  scopes: z.array(z.enum(API_KEY_SCOPES)).min(1).max(API_KEY_SCOPES.length),
  expiresInDays: z
    .union([z.literal(30), z.literal(90), z.literal(365)])
    .nullable(),
});

export type CreateApiKeyInput = z.input<typeof createSchema>;

function parse<S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new ServerError(
      parsed.error.issues.map((i) => i.message).join("; "),
      "ValidationError",
    );
  }
  return parsed.data;
}

const targetId = (target: ApiKeyTarget) =>
  target.type === "server" ? target.serverId : target.groupId;

// Audit entries land on the server or group the key belongs to
const auditAction = (target: ApiKeyTarget, verb: string) =>
  `${target.type}.api-keys.${verb}`;

function requireManage(session: Session, target: ApiKeyTarget): void {
  if (!canManageApiKeysFor(actorFromSession(session), target)) {
    throw new ServerError("Unauthorized", "Unauthorized");
  }
}

async function requireLiveTarget(target: ApiKeyTarget): Promise<void> {
  const db = getClient();
  const found =
    target.type === "server"
      ? await db.servers.findFirst({
          where: { id: target.serverId, deletedAt: null },
          select: { id: true },
        })
      : await db.groups.findFirst({
          where: { id: target.groupId, deletedAt: null },
          select: { id: true },
        });
  if (!found) throw new ServerError("Not found", "NotFound");
}

async function findKey(id: string) {
  const key = await getClient().apiKeys.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      serverId: true,
      groupId: true,
      revokedAt: true,
    },
  });
  if (!key) throw new ServerError("API key not found", "NotFound");
  return { ...key, target: apiKeyTarget(key) };
}

// Creates a key for a server or group; the token is returned once and never stored
export async function createApiKey(
  input: CreateApiKeyInput,
): Promise<ServerResponse<{ token: string; key: ApiKeyRow }>> {
  return doServerActionWithAuth([], async (session) => {
    const values = parse(createSchema, input);
    const target: ApiKeyTarget = values.target;
    requireManage(session, target);
    await requireLiveTarget(target);

    const { token, prefix, hash } = generateApiKeyToken();
    const expiresAt = values.expiresInDays
      ? new Date(Date.now() + values.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const key = await withAudit(
      (tx) =>
        tx.apiKeys.create({
          data: {
            name: values.name,
            prefix,
            hash,
            scopes: values.scopes,
            serverId: target.type === "server" ? target.serverId : null,
            groupId: target.type === "group" ? target.groupId : null,
            createdById: session.user.id,
            expiresAt,
          },
          select: apiKeyRowSelect,
        }),
      (created) => [
        session.user.id,
        targetId(target),
        auditAction(target, "create"),
        {
          id: created.id,
          name: created.name,
          prefix: created.prefix,
          scopes: values.scopes,
          expiresAt: expiresAt?.toISOString() ?? null,
        },
      ],
    );

    return { token, key: toApiKeyRow(key) };
  });
}

export async function renameApiKey(
  id: string,
  name: string,
): Promise<ServerResponse> {
  return doServerActionWithAuth([], async (session) => {
    const keyId = parse(resourceId, id);
    const newName = parse(keyName, name);
    const key = await findKey(keyId);
    requireManage(session, key.target);

    await withAudit(
      (tx) =>
        tx.apiKeys.update({ where: { id: keyId }, data: { name: newName } }),
      () => [
        session.user.id,
        targetId(key.target),
        auditAction(key.target, "rename"),
        { id: keyId, from: key.name, to: newName },
      ],
    );
  });
}

// Admins of the key's server or group can revoke it, and so can holders of api-keys:revoke
export async function revokeApiKey(id: string): Promise<ServerResponse> {
  return doServerActionWithAuth([], async (session) => {
    const keyId = parse(resourceId, id);
    const key = await findKey(keyId);
    if (!hasPermissionSync(session, ["api-keys:revoke"])) {
      requireManage(session, key.target);
    }
    if (key.revokedAt) return;

    await withAudit(
      (tx) =>
        tx.apiKeys.update({
          where: { id: keyId },
          data: { revokedAt: new Date() },
        }),
      () => [
        session.user.id,
        targetId(key.target),
        auditAction(key.target, "revoke"),
        { id: keyId, name: key.name },
      ],
    );
  });
}
