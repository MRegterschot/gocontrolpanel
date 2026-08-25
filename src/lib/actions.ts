"use server";
import { PermissionCheck } from "@/lib/permissions";
import { ServerResponse } from "@/types/responses";
import { Session } from "next-auth";
import { withAuth } from "./auth";
import { isExpectedError, toClientError } from "./errors";
import { logger } from "./logger";
import { reportException } from "./sentry/report";

type ActionMeta = Record<string, string>;

/**
 * Single place where a thrown error becomes a response.
 *
 * The client gets a sanitised message (see `./errors`); the logger and Sentry get
 * the original. Routine failures such as an unauthorized request are logged at
 * `warn` and skip Sentry entirely -- they are not incidents, and reporting every
 * one of them buries the real failures.
 */
function handleActionError<T>(
  error: unknown,
  meta: ActionMeta,
  message: string,
  session?: Session | null,
): ServerResponse<T> {
  const expected = isExpectedError(error);

  if (expected) {
    logger.warn({ meta, error }, message);
  } else {
    logger.error({ meta, error }, message);
    reportException(error, meta, session);
  }

  const client = toClientError(error);

  return {
    ok: false,
    error: client.message,
    code: client.code,
  };
}

export async function doServerAction<T>(
  action: () => Promise<T>,
): Promise<ServerResponse<T>> {
  try {
    const result = await action();
    return {
      ok: true,
      data: result,
    };
  } catch (error) {
    return handleActionError<T>(
      error,
      {
        type: "server",
        module: "actions",
        function: "doServerAction",
      },
      "Error executing server action",
    );
  }
}

export async function doServerActionWithAuth<T>(
  roles: readonly PermissionCheck[],
  action: (session: Session) => Promise<T>,
): Promise<ServerResponse<T>> {
  let session: Session | null = null;
  const meta: ActionMeta = {
    type: "server",
    module: "actions",
    function: "doServerActionWithAuth",
  };

  try {
    session = await withAuth(roles);
  } catch (error) {
    return handleActionError<T>(
      error,
      meta,
      "Error during auth check server action with auth",
      session,
    );
  }

  try {
    const result = await action(session);
    return {
      ok: true,
      data: result,
    };
  } catch (error) {
    return handleActionError<T>(
      error,
      meta,
      "Error executing server action with auth",
      session,
    );
  }
}
