import * as Sentry from "@sentry/nextjs";
import { Session } from "next-auth";

export function reportException(
  error: unknown,
  meta: Record<string, string>,
  session?: Session | null,
) {
  Sentry.captureException(error, (scope) => {
    scope.setTags(meta);

    if (session?.user?.id) {
      scope.setUser({
        id: session.user.id,
        accountId: session.user.accountId,
        displayName: session.user.displayName,
      });
    }

    return scope;
  });
}
