import { HetznerApiError } from "@/types/api/hetzner/error";
import { ServerError } from "@/types/responses";
import { capitalize } from "./utils";

/**
 * Error classification for the server-action boundary.
 *
 * Everything thrown deliberately in this codebase is a `ServerError` (there are
 * no bare `throw new Error(...)` sites), so authorship is a reliable signal for
 * whether a message is safe to send to the browser:
 *
 * - `ServerError` — written by us for this situation. Safe.
 * - Hetzner API errors — third-party *validation* feedback ("name already used").
 *   Useful and safe.
 * - XML-RPC faults — feedback from the game server ("Login unknown"). Safe.
 * - Anything else — Prisma, ssh2, fetch, TypeError. These leak schema, host and
 *   query detail, so the client gets a generic message and the real one goes to
 *   pino and Sentry.
 */

const GENERIC_MESSAGE = "Something went wrong";
const GENERIC_CODE = "InternalError";

/**
 * Errors that are part of normal operation. They are still logged, but at `warn`
 * and without a Sentry event -- an unauthorized request is not an incident, and
 * reporting every one of them buries the real failures.
 */
const EXPECTED_CODES = new Set(["Unauthorized", "ValidationError"]);

const XML_RPC_FAULT = /Error: XML-RPC fault:\s*(.*)/;

function isHetznerApiError(error: unknown): error is HetznerApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    typeof (error as HetznerApiError).message === "string" &&
    typeof (error as HetznerApiError).code === "string"
  );
}

export type ClientError = {
  /** Safe to render. */
  message: string;
  /** Stable identifier the UI can branch on. */
  code: string;
};

/** True when the error is routine and should not raise a Sentry event. */
export function isExpectedError(error: unknown): boolean {
  return error instanceof ServerError && EXPECTED_CODES.has(error.name);
}

/**
 * Reduces an arbitrary thrown value to something safe to send to the browser.
 * Unrecognised errors collapse to a generic message; the detail is preserved for
 * the logger and Sentry, which receive the original.
 */
export function toClientError(error: unknown): ClientError {
  if (error instanceof ServerError) {
    const fault = error.message.match(XML_RPC_FAULT);
    return {
      message: fault ? fault[1] : error.message,
      code: error.name || GENERIC_CODE,
    };
  }

  // Every other Error subclass is someone else's: Prisma, ssh2, undici, and so
  // on. This check has to come *before* the Hetzner one -- a Prisma error also
  // carries string `code` and `message` properties ("P2022"), so it would
  // otherwise be mistaken for third-party validation feedback and its message,
  // which quotes the failing query, would be sent to the browser.
  if (error instanceof Error) {
    return { message: GENERIC_MESSAGE, code: GENERIC_CODE };
  }

  // The Hetzner axios interceptor rejects with a plain object literal, never an
  // Error, which is what distinguishes it here.
  if (isHetznerApiError(error)) {
    return { message: capitalize(error.message), code: error.code };
  }

  return { message: GENERIC_MESSAGE, code: GENERIC_CODE };
}
