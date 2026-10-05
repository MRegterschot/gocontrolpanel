import { ServerError } from "@/types/responses";
import type { ApiErrorBody } from "@tmcp/shared";

// Without a limit a stalled service holds a request for undici's default of 300 s
export const DEFAULT_TIMEOUT_MS = 30_000;
// For calls that can legitimately run long (changing big map lists, reconnecting, reloading plugins)
export const LONG_TIMEOUT_MS = 120_000;

export type HttpMethod = "GET" | "POST" | "PUT";

export interface ServiceRequestOptions {
  baseUrl: string;
  token: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
  log?: { error: (obj: object, msg: string) => void };
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && error.name === "TimeoutError";
}

// Calls the internal API of the GBX service and unwraps its { data } / { error } envelope
export async function serviceRequest<T>(
  method: HttpMethod,
  path: string,
  body: unknown,
  options: ServiceRequestOptions,
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const doFetch = options.fetch ?? fetch;

  let res: Response;
  let payload: unknown;
  try {
    res = await doFetch(`${options.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${options.token}`,
        ...(body !== undefined && { "Content-Type": "application/json" }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
      // The signal also covers reading the body, so a response that stalls half way is cut off too
      signal: AbortSignal.timeout(timeoutMs),
    });
    payload = await res.json().catch((error) => {
      if (isTimeout(error)) throw error;
      return null;
    });
  } catch (error) {
    const timedOut = isTimeout(error);
    options.log?.error(
      { error, path, timedOut },
      timedOut ? "GBX service timed out" : "GBX service is unreachable",
    );
    throw new ServerError(
      timedOut
        ? `GBX service did not respond within ${Math.ceil(timeoutMs / 1000)} s`
        : "GBX service is unavailable",
      "GbxServiceUnavailable",
    );
  }

  if (!res.ok) {
    const error = (payload as ApiErrorBody | null)?.error;
    throw new ServerError(
      error?.message ?? `GBX service responded with ${res.status}`,
      error?.code ?? "GbxServiceError",
    );
  }

  return (payload as { data: T }).data;
}
