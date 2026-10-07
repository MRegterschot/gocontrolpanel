import { ServerError, ServerResponse } from "@/types/responses";
import {
  hasPermission,
  sessionClaimsSchema,
  type SessionClaims,
} from "@gcp/shared";
import type { Session } from "next-auth";
import "server-only";
import { getClient } from "./dbclient";
import { logger } from "./logger";
import { reportException } from "./sentry/report";
import { getErrorMessage, getList } from "./utils";

// Who performs an operation. Browser requests build it from the session; Codriver builds it
// from the in-game login, which the dedicated server has already authenticated.
// Deliberately not a "use server" module: an exported function there becomes a client-callable
// endpoint, and these take claims as plain arguments.
export interface Actor {
  // null for a player without a panel account
  userId: string | null;
  login: string;
  displayName: string;
  claims: SessionClaims;
}

export function actorFromSession(session: Session): Actor {
  const claims = sessionClaimsSchema.parse(session.user);
  return {
    userId: session.user.id,
    login: claims.login,
    displayName: claims.displayName,
    claims,
  };
}

export function guestActor(login: string): Actor {
  return {
    userId: null,
    login,
    displayName: login,
    claims: sessionClaimsSchema.parse({
      id: "",
      login,
      displayName: login,
      admin: false,
    }),
  };
}

// Roles straight from the database, so a role change applies to the next request instead of after
// the session token refreshes. Unauthenticated user rows count: they only hold roles an admin
// assigned to that login, like the GBX service's admin check.
export async function actorForLogin(login: string): Promise<Actor> {
  const db = getClient();
  const user = await db.users.findUnique({
    where: { login },
    select: {
      id: true,
      login: true,
      nickName: true,
      admin: true,
      permissions: true,
      userServers: {
        where: { server: { deletedAt: null } },
        select: { role: true, server: { select: { id: true, name: true } } },
      },
      groupMembers: {
        where: { group: { deletedAt: null } },
        select: {
          role: true,
          group: {
            select: {
              id: true,
              name: true,
              groupServers: {
                where: { server: { deletedAt: null } },
                select: { server: { select: { id: true, name: true } } },
              },
            },
          },
        },
      },
      hetznerProjectUsers: {
        where: { project: { deletedAt: null } },
        select: { role: true, project: { select: { id: true, name: true } } },
      },
    },
  });
  if (!user) return guestActor(login);

  const groups = user.groupMembers.map((member) => ({
    id: member.group.id,
    name: member.group.name,
    role: member.role,
    servers: member.group.groupServers.map((gs) => gs.server),
  }));

  // Public groups make every panel user a Member of their servers, as in the session token
  const publicGroups = await db.groups.findMany({
    where: { deletedAt: null, public: true },
    select: {
      id: true,
      name: true,
      groupServers: {
        where: { server: { deletedAt: null } },
        select: { server: { select: { id: true, name: true } } },
      },
    },
  });
  for (const group of publicGroups) {
    if (groups.some((g) => g.id === group.id)) continue;
    groups.push({
      id: group.id,
      name: group.name,
      role: "Member",
      servers: group.groupServers.map((gs) => gs.server),
    });
  }

  const claims = sessionClaimsSchema.parse({
    id: user.id,
    login: user.login,
    displayName: user.nickName,
    admin: user.admin,
    permissions: getList<string>(user.permissions),
    servers: user.userServers.map((us) => ({ ...us.server, role: us.role })),
    groups,
    projects: user.hetznerProjectUsers.map((hp) => ({
      ...hp.project,
      role: hp.role,
    })),
  });

  return {
    userId: user.id,
    login: user.login,
    displayName: user.nickName,
    claims,
  };
}

// Fails closed: an empty permission list grants nothing here, unlike the session helpers
export function actorHasPermission(
  actor: Actor,
  required: readonly string[],
  id = "",
): boolean {
  if (required.length === 0) return false;
  return hasPermission(actor.claims, required, id);
}

export function requirePermission(
  actor: Actor,
  required: readonly string[],
  id = "",
): void {
  if (!actorHasPermission(actor, required, id)) {
    throw new ServerError("Unauthorized", "Unauthorized");
  }
}

// doServerActionWithAuth for a known actor: checks the permissions and wraps the result
export async function doActionAs<T>(
  actor: Actor,
  required: readonly string[],
  action: (actor: Actor) => Promise<T>,
  id = "",
): Promise<ServerResponse<T>> {
  const meta = { type: "server", module: "actor", function: "doActionAs" };
  try {
    requirePermission(actor, required, id);
    return { data: await action(actor) };
  } catch (error) {
    if (!(error instanceof ServerError && error.name === "Unauthorized")) {
      logger.error(
        { meta, error, login: actor.login },
        "Error executing action as actor",
      );
      reportException(error, meta);
    }
    return {
      data: undefined as T,
      error: getErrorMessage(error),
      code: error instanceof Error ? error.name : undefined,
    };
  }
}
