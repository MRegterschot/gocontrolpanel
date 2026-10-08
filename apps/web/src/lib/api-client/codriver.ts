import type * as Codriver from "@/services/codriver";
import type { CodriverChatReply } from "@/types/codriver";
import { readSseEvents } from "@gcp/shared";
import { apiGet } from "./http";

const server = (serverId: string) =>
  `/api/servers/${encodeURIComponent(serverId)}`;

export const getCodriverPanelOverview = (
  signal?: AbortSignal,
): ReturnType<typeof Codriver.getCodriverPanelOverview> =>
  apiGet("/api/codriver", undefined, { signal });

export const checkCodriverAccess = (
  serverId: string,
  login: string,
  signal?: AbortSignal,
): ReturnType<typeof Codriver.checkCodriverAccess> =>
  apiGet("/api/codriver/access", { serverId, login }, { signal });

export const getCodriverServerOverview = (
  serverId: string,
  signal?: AbortSignal,
): ReturnType<typeof Codriver.getCodriverServerOverview> =>
  apiGet(`${server(serverId)}/codriver`, undefined, { signal });

// Endpoint for usePaginationAPI
export const codriverRequestsPath = (serverId?: string) =>
  serverId ? `${server(serverId)}/codriver/requests` : "/api/codriver/requests";

export const getCodriverChatAccess = (
  serverId: string,
  signal?: AbortSignal,
): ReturnType<typeof Codriver.getCodriverChatAccess> =>
  apiGet(`${server(serverId)}/codriver/chat`, undefined, { signal });

export const getCodriverUsage = (
  serverId?: string,
  signal?: AbortSignal,
): ReturnType<typeof import("@/services/codriver-usage").getCodriverUsage> =>
  apiGet(
    serverId ? `${server(serverId)}/codriver/usage` : "/api/codriver/usage",
    undefined,
    { signal },
  );

// Sends a chat message and reads the event stream: progress lines, then the reply
export async function streamCodriverMessage(
  serverId: string,
  text: string,
  confirmationId: string | undefined,
  onProgress: (text: string) => void,
  signal?: AbortSignal,
): Promise<CodriverChatReply> {
  const response = await fetch(`${server(serverId)}/codriver/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ text, confirmationId }),
    signal,
  });
  if (!response.ok || !response.body) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? "Could not reach Codriver");
  }

  for await (const { event, data } of readSseEvents(response.body)) {
    const payload = JSON.parse(data);
    if (event === "progress") onProgress(String(payload.text ?? ""));
    else if (event === "reply") return payload as CodriverChatReply;
    else if (event === "error")
      throw new Error(payload.message ?? "Codriver is unavailable right now.");
  }
  throw new Error("The connection closed before Codriver answered.");
}
