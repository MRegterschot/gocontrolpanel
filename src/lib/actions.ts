"use server";
import { PermissionCheck } from "@/lib/permissions";
import { ServerResponse } from "@/types/responses";
import { Session } from "next-auth";
import { withAuth } from "./auth";
import { logger } from "./logger";
import { reportException } from "./sentry/report";
import { getErrorMessage } from "./utils";

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
    const meta = {
      type: "server",
      module: "actions",
      function: "doServerAction",
    };
    logger.error({ meta, error }, "Error executing server action");

    reportException(error, meta);

    return {
      ok: false,
      error: getErrorMessage(error),
    };
  }
}

export async function doServerActionWithAuth<T>(
  roles: readonly PermissionCheck[],
  action: (session: Session) => Promise<T>,
): Promise<ServerResponse<T>> {
  let session: Session | null = null;
  const meta = {
    type: "server",
    module: "actions",
    function: "doServerActionWithAuth",
  };
  try {
    session = await withAuth(roles);
  } catch (error) {
    logger.error(
      { meta, error },
      "Error during auth check server action with auth",
    );

    reportException(error, meta, session);

    return {
      ok: false,
      error: getErrorMessage(error),
    };
  }

  try {
    const result = await action(session);
    return {
      ok: true,
      data: result,
    };
  } catch (error) {
    logger.error({ meta, error }, "Error executing server action with auth");

    reportException(error, meta, session);

    return {
      ok: false,
      error: getErrorMessage(error),
    };
  }
}
