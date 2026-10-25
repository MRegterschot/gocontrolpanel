import { API_KEY_SCOPES, type ApiKeyScope } from "@tmcontrolpanel/shared";
import { NextRequest } from "next/server";

// Shared fixtures for v1 handler tests; each test file mocks authenticateApiKey itself

export const serverA = { id: "server-a", name: "A", description: "a" };
export const serverB = { id: "server-b", name: "B", description: "b" };
export const actor = { userId: "user-1", login: "creator", apiKeyId: "key-1" };

export function principal(scopes: readonly ApiKeyScope[] = API_KEY_SCOPES) {
  return {
    keyId: "key-1",
    name: "Bot",
    scopes: [...scopes],
    target: { type: "group", groupId: "group-1" },
    servers: [serverA, serverB],
    actor,
  };
}

export function req(
  urlPath: string,
  init: { method?: string; body?: unknown } = {},
) {
  return new NextRequest(`http://localhost/api/v1${urlPath}`, {
    method: init.method ?? "GET",
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    headers: { authorization: "Bearer gcp_x" },
  });
}

export const ctx = (params: Record<string, string> = {}) => ({
  params: Promise.resolve(params),
});

export const onA = (extra: Record<string, string> = {}) =>
  ctx({ serverId: "server-a", ...extra });
