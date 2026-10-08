import { type Actor, requirePermission } from "@/lib/actor";
import { gbxService, getGbxClient } from "@/lib/gbx-service";
import { serverPermissions } from "@gcp/shared";
import "server-only";
import { logAudit } from "../../database/server-only/audit-logs";

// Player operations for an actor; the Server Actions and Codriver both call these

export async function banPlayerAs(
  actor: Actor,
  serverId: string,
  login: string,
  reason: string,
): Promise<void> {
  requirePermission(actor, serverPermissions.moderator, serverId);

  const client = getGbxClient(serverId);
  await client.call("Ban", login, reason);
  await logAudit(actor.userId, serverId, "server.players.banlist.add", {
    login,
    reason,
  });
}

export async function unbanPlayerAs(
  actor: Actor,
  serverId: string,
  login: string,
): Promise<void> {
  requirePermission(actor, serverPermissions.moderator, serverId);

  const client = getGbxClient(serverId);
  await client.call("UnBan", login);
  await logAudit(
    actor.userId,
    serverId,
    "server.players.banlist.remove",
    login,
  );
}

export async function blacklistPlayerAs(
  actor: Actor,
  serverId: string,
  login: string,
): Promise<void> {
  requirePermission(actor, serverPermissions.moderator, serverId);

  const client = getGbxClient(serverId);
  await client.call("BlackList", login);
  await logAudit(actor.userId, serverId, "server.players.blacklist.add", login);
}

export async function unblacklistPlayerAs(
  actor: Actor,
  serverId: string,
  login: string,
): Promise<void> {
  requirePermission(actor, serverPermissions.moderator, serverId);

  const client = getGbxClient(serverId);
  await client.call("UnBlackList", login);
  await logAudit(
    actor.userId,
    serverId,
    "server.players.blacklist.remove",
    login,
  );
}

export async function addGuestAs(
  actor: Actor,
  serverId: string,
  login: string,
): Promise<void> {
  requirePermission(actor, serverPermissions.moderator, serverId);

  const client = getGbxClient(serverId);
  await client.call("AddGuest", login);
  await logAudit(actor.userId, serverId, "server.players.guestlist.add", login);
}

export async function removeGuestAs(
  actor: Actor,
  serverId: string,
  login: string,
): Promise<void> {
  requirePermission(actor, serverPermissions.moderator, serverId);

  const client = getGbxClient(serverId);
  await client.call("RemoveGuest", login);
  await logAudit(
    actor.userId,
    serverId,
    "server.players.guestlist.remove",
    login,
  );
}

export async function kickPlayerAs(
  actor: Actor,
  serverId: string,
  login: string,
  reason: string,
): Promise<void> {
  requirePermission(actor, serverPermissions.moderator, serverId);

  const client = getGbxClient(serverId);
  await client.call("Kick", login, reason);
  await logAudit(actor.userId, serverId, "server.players.kick", {
    login,
    reason,
  });
}

export async function forceSpectatorAs(
  actor: Actor,
  serverId: string,
  login: string,
  status: number,
): Promise<void> {
  requirePermission(actor, serverPermissions.moderator, serverId);

  const client = getGbxClient(serverId);
  await client.call("ForceSpectator", login, status);
  await logAudit(actor.userId, serverId, "server.players.spectator.set", {
    login,
    status,
  });
}

export async function setPlayerRoundPointsAs(
  actor: Actor,
  serverId: string,
  login: string,
  points: number,
): Promise<void> {
  requirePermission(actor, serverPermissions.moderator, serverId);

  await gbxService.setPlayerPoints(serverId, login, "round", points);

  await logAudit(actor.userId, serverId, "server.players.roundpoints.set", {
    login,
    points,
  });
}

export async function setPlayerMapPointsAs(
  actor: Actor,
  serverId: string,
  login: string,
  points: number,
): Promise<void> {
  requirePermission(actor, serverPermissions.moderator, serverId);

  await gbxService.setPlayerPoints(serverId, login, "map", points);

  await logAudit(actor.userId, serverId, "server.players.mappoints.set", {
    login,
    points,
  });
}

export async function setPlayerMatchPointsAs(
  actor: Actor,
  serverId: string,
  login: string,
  points: number,
): Promise<void> {
  requirePermission(actor, serverPermissions.moderator, serverId);

  await gbxService.setPlayerPoints(serverId, login, "match", points);

  await logAudit(actor.userId, serverId, "server.players.matchpoints.set", {
    login,
    points,
  });
}

export async function setTeamRoundPointsAs(
  actor: Actor,
  serverId: string,
  teamId: number,
  points: number,
): Promise<void> {
  requirePermission(actor, serverPermissions.moderator, serverId);

  await gbxService.setTeamPoints(serverId, teamId, "round", points);

  await logAudit(
    actor.userId,
    serverId,
    "server.players.team.roundpoints.set",
    { teamId, points },
  );
}

export async function setTeamMapPointsAs(
  actor: Actor,
  serverId: string,
  teamId: number,
  points: number,
): Promise<void> {
  requirePermission(actor, serverPermissions.moderator, serverId);

  await gbxService.setTeamPoints(serverId, teamId, "map", points);

  await logAudit(actor.userId, serverId, "server.players.team.mappoints.set", {
    teamId,
    points,
  });
}

export async function setTeamMatchPointsAs(
  actor: Actor,
  serverId: string,
  teamId: number,
  points: number,
): Promise<void> {
  requirePermission(actor, serverPermissions.moderator, serverId);

  await gbxService.setTeamPoints(serverId, teamId, "match", points);

  await logAudit(
    actor.userId,
    serverId,
    "server.players.team.matchpoints.set",
    { teamId, points },
  );
}
