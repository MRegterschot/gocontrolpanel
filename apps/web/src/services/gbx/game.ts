import { doServerActionWithAuth } from "@/lib/actions";
import { getGbxClient } from "@/lib/gbx-service";
import { ModeScriptInfo } from "@/types/gbx";
import { ServerResponse } from "@/types/responses";
import "server-only";

export async function getShowOpponents(serverId: string): Promise<
  ServerResponse<{
    CurrentValue: number;
    NextValue: number;
  }>
> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async () => {
      const client = getGbxClient(serverId);
      return await client.call("GetForceShowAllOpponents");
    },
  );
}

export async function getScriptName(serverId: string): Promise<
  ServerResponse<{
    CurrentValue: string;
    NextValue: string;
  }>
> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async () => {
      const client = getGbxClient(serverId);
      return await client.call("GetScriptName");
    },
  );
}

export async function getModeScriptInfo(
  serverId: string,
): Promise<ServerResponse<ModeScriptInfo>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async () => {
      const client = getGbxClient(serverId);
      return await client.call("GetModeScriptInfo");
    },
  );
}

export async function getModeScriptSettings(serverId: string): Promise<
  ServerResponse<{
    [key: string]: string | number | boolean;
  }>
> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async () => {
      const client = getGbxClient(serverId);
      return await client.call("GetModeScriptSettings");
    },
  );
}
