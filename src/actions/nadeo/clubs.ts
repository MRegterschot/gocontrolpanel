"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import {
  downloadFile,
  getAccountNames,
  getClubActivities,
  getClubById,
  getClubCampaign,
  getClubCampaigns,
  getClubMembers,
  getClubRoom,
  getClubs,
} from "@/lib/api/nadeo";
import { getFileManager } from "@/lib/managers/file-manager";
import {
  getKeyClubActivities,
  getKeyClubActivitiesPaginated,
  getKeyClubCampaign,
  getKeyClubCampaignsPaginated,
  getKeyClubMembersCount,
  getKeyClubMembersPaginated,
  getKeyClubsPaginated,
  getRedisClient,
} from "@/lib/redis";
import {
  Club,
  ClubActivitiesResponse,
  ClubActivity,
  ClubCampaign,
  ClubCampaignWithNamesAndPlaylistMaps,
  ClubMemberWithName,
  ClubRoomWithNamesAndMaps,
  ClubWithAccountNames,
  RoomWithMaps,
} from "@/types/api/nadeo";
import { PaginationResponse, ServerResponse } from "@/types/responses";
import { PaginationState } from "@tanstack/react-table";
import { getMapsByUids } from "../database/maps";
import { logAudit } from "../database/server-only/audit-logs";
import { uploadFiles } from "../filemanager";
import { addMapToServer } from "./maps";

export async function getClubCampaignsPaginated(
  pagination: PaginationState,
  _: { field: string; order: "asc" | "desc" },
  filter?: string,
): Promise<ServerResponse<PaginationResponse<ClubCampaign>>> {
  return doServerActionWithAuth(
    [
      "servers::moderator",
      "servers::admin",
      "group:servers::moderator",
      "group:servers::admin",
    ],
    async () => {
      const redis = await getRedisClient();
      const key = getKeyClubCampaignsPaginated(pagination, filter);

      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }

      const response = await getClubCampaigns(
        pagination.pageIndex * pagination.pageSize,
        filter,
        pagination.pageSize,
      );

      const paginatedResponse = {
        totalCount: response.itemCount,
        data: response.clubCampaignList,
      };

      await redis.set(key, JSON.stringify(paginatedResponse), "EX", 300);

      return paginatedResponse;
    },
  );
}

export async function getClubsPaginated(
  pagination: PaginationState,
  _: { field: string; order: "asc" | "desc" },
  filter?: string,
): Promise<ServerResponse<PaginationResponse<Club>>> {
  return doServerActionWithAuth(
    [
      "servers::moderator",
      "servers::admin",
      "group:servers::moderator",
      "group:servers::admin",
    ],
    async () => {
      const redis = await getRedisClient();
      const key = getKeyClubsPaginated(pagination, filter);

      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }

      const response = await getClubs(
        pagination.pageIndex * pagination.pageSize,
        filter,
        pagination.pageSize,
      );

      const paginatedResponse = {
        totalCount: response.clubCount,
        data: response.clubList,
      };

      await redis.set(key, JSON.stringify(paginatedResponse), "EX", 300);

      return paginatedResponse;
    },
  );
}

export async function getClubActivitiesPaginated(
  pagination: PaginationState,
  _: { field: string; order: "asc" | "desc" },
  __?: string,
  fetchArgs?: number,
): Promise<ServerResponse<PaginationResponse<ClubActivity>>> {
  return doServerActionWithAuth(
    [
      "servers::moderator",
      "servers::admin",
      "group:servers::moderator",
      "group:servers::admin",
    ],
    async () => {
      if (!fetchArgs) {
        throw new Error("No club id provided");
      }

      const redis = await getRedisClient();
      const key = getKeyClubActivitiesPaginated(fetchArgs, pagination);

      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }

      const response = await getClubActivities(
        fetchArgs,
        pagination.pageIndex * pagination.pageSize,
      );

      const paginatedResponse = {
        totalCount: response.itemCount,
        data: response.activityList,
      };

      await redis.set(key, JSON.stringify(paginatedResponse), "EX", 300);

      return paginatedResponse;
    },
  );
}

export async function getClubActivitiesList(
  clubId: number,
  offset = 0,
  length = 12,
): Promise<ServerResponse<ClubActivitiesResponse>> {
  return doServerActionWithAuth(
    [
      "servers::moderator",
      "servers::admin",
      "group:servers::moderator",
      "group:servers::admin",
    ],
    async () => {
      const redis = await getRedisClient();
      const key = getKeyClubActivities(clubId, offset);

      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }

      const response = await getClubActivities(clubId, offset, length);

      await redis.set(key, JSON.stringify(response), "EX", 300);

      return response;
    },
  );
}

export async function getClubCampaignWithMaps(
  clubId: number,
  campaignId: number,
): Promise<ServerResponse<ClubCampaignWithNamesAndPlaylistMaps>> {
  return doServerActionWithAuth(
    [
      "servers::moderator",
      "servers::admin",
      "group:servers::moderator",
      "group:servers::admin",
    ],
    async () => {
      const redis = await getRedisClient();
      const key = getKeyClubCampaign(clubId, campaignId);

      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }

      const campaign = await getClubCampaign(clubId, campaignId);

      const mapUids = campaign.campaign.playlist.map((m) => m.mapUid);
      const { data: maps, error } = await getMapsByUids(mapUids);
      if (error) {
        throw new Error(error);
      }

      const accountNames = await getAccountNames([
        campaign.creatorAccountId,
        campaign.latestEditorAccountId,
      ]);

      const response = {
        ...campaign,
        creatorName: accountNames[campaign.creatorAccountId] || "Unknown",
        latestEditorName:
          accountNames[campaign.latestEditorAccountId] || "Unknown",
        campaign: {
          ...campaign.campaign,
          playlist: campaign.campaign.playlist
            .map((p) => ({
              ...p,
              map: maps.find((m) => m.uid === p.mapUid),
            }))
            .filter((p) => p.map !== undefined),
        },
      } as ClubCampaignWithNamesAndPlaylistMaps;

      await redis.set(key, JSON.stringify(response), "EX", 300);

      return response;
    },
  );
}

export async function getClub(
  clubId: number,
): Promise<ServerResponse<ClubWithAccountNames>> {
  return doServerActionWithAuth(
    [
      "servers::moderator",
      "servers::admin",
      "group:servers::moderator",
      "group:servers::admin",
    ],
    async () => {
      const redis = await getRedisClient();
      const key = `club:${clubId}`;

      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }

      const club = await getClubById(clubId);
      const accountNames = await getAccountNames([
        club.authorAccountId,
        club.latestEditorAccountId,
      ]);

      const clubWithAccountNames = {
        ...club,
        authorName: accountNames[club.authorAccountId] || "Unknown",
        latestEditorName: accountNames[club.latestEditorAccountId] || "Unknown",
      };

      await redis.set(key, JSON.stringify(clubWithAccountNames), "EX", 300);

      return clubWithAccountNames;
    },
  );
}

export async function getClubMembersCount(
  clubId: number,
): Promise<ServerResponse<number>> {
  return doServerActionWithAuth(
    [
      "servers::moderator",
      "servers::admin",
      "group:servers::moderator",
      "group:servers::admin",
    ],
    async () => {
      const redis = await getRedisClient();
      const key = getKeyClubMembersCount(clubId);

      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }

      const { itemCount } = await getClubMembers(clubId, 0, 1);

      await redis.set(key, JSON.stringify(itemCount), "EX", 300);

      return itemCount;
    },
  );
}

export async function getClubMembersWithNamesPaginated(
  pagination: PaginationState,
  _: { field: string; order: "asc" | "desc" },
  __: string,
  fetchArgs?: number,
): Promise<ServerResponse<PaginationResponse<ClubMemberWithName>>> {
  return doServerActionWithAuth(
    [
      "servers::moderator",
      "servers::admin",
      "group:servers::moderator",
      "group:servers::admin",
    ],
    async () => {
      if (!fetchArgs) {
        throw new Error("No club id provided");
      }

      const redis = await getRedisClient();
      const key = getKeyClubMembersPaginated(fetchArgs, pagination);

      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }

      const clubMembers = await getClubMembers(
        fetchArgs,
        pagination.pageIndex * pagination.pageSize,
        pagination.pageSize,
      );

      const accountIds = clubMembers.clubMemberList.map((m) => m.accountId);
      const accountNames = await getAccountNames(accountIds);

      const clubMembersWithNames: ClubMemberWithName[] =
        clubMembers.clubMemberList.map((member) => ({
          ...member,
          accountName: accountNames[member.accountId] || "Unknown",
        }));

      const response = {
        totalCount: clubMembers.itemCount,
        data: clubMembersWithNames,
      };

      await redis.set(key, JSON.stringify(response), "EX", 300);

      return response;
    },
  );
}

export async function getClubRoomWithNamesAndMaps(
  clubId: number,
  roomId: number,
): Promise<ServerResponse<ClubRoomWithNamesAndMaps>> {
  return doServerActionWithAuth(
    [
      "servers::moderator",
      "servers::admin",
      "group:servers::moderator",
      "group:servers::admin",
    ],
    async () => {
      const clubRoom = await getClubRoom(clubId, roomId);

      const accountNames = await getAccountNames([
        clubRoom.creatorAccountId,
        clubRoom.latestEditorAccountId,
      ]);

      const { data: maps, error } = await getMapsByUids(clubRoom.room.maps);
      if (error) {
        throw new Error(error);
      }

      return {
        ...clubRoom,
        room: {
          ...clubRoom.room,
          mapObjects: maps,
        },
        creatorName: accountNames[clubRoom.creatorAccountId] || "Unknown",
        latestEditorName:
          accountNames[clubRoom.latestEditorAccountId] || "Unknown",
      };
    },
  );
}

export async function downloadRoom(
  serverId: string,
  room: RoomWithMaps | ClubRoomWithNamesAndMaps["room"],
): Promise<ServerResponse<string[]>> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      const fileManager = await getFileManager(serverId);
      if (!fileManager?.health) {
        await logAudit(
          session.user.id,
          serverId,
          "server.nadeo.room.download",
          JSON.parse(JSON.stringify(room)),
          "File manager is not healthy",
        );
        throw new Error("File manager is not healthy");
      }

      const downloadResults = await Promise.allSettled(
        room.mapObjects.map((map) => {
          if (!map?.fileUrl) {
            return Promise.reject(
              new Error(`Map ${map.uid} does not have a valid download URL`),
            );
          }
          return downloadFile(map.fileUrl, map.fileName);
        }),
      );

      const formData = new FormData();
      let errors = 0;

      downloadResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          const file = result.value;
          formData.append("files", file);
          formData.append("paths[]", `/UserData/Maps/Downloaded/${room.name}`);
        } else {
          errors++;
          console.error(`Failed to download map ${index + 1}:`, result.reason);
        }
      });

      const { error } = await uploadFiles(serverId, formData);
      if (error) {
        await logAudit(
          session.user.id,
          serverId,
          "server.nadeo.room.download",
          JSON.parse(JSON.stringify(room)),
          error,
        );
        throw new Error(error);
      }

      await logAudit(
        session.user.id,
        serverId,
        "server.nadeo.room.download",
        JSON.parse(JSON.stringify(room)),
        errors > 0 ? `Failed to download ${errors} maps` : undefined,
      );

      if (errors > 0) {
        throw new Error(`Failed to download ${errors} maps`);
      }

      return downloadResults
        .map((result) =>
          result.status === "fulfilled" ? result.value.name : "",
        )
        .filter((name) => name !== "");
    },
  );
}

export async function addRoomToServer(
  serverId: string,
  room: RoomWithMaps | ClubRoomWithNamesAndMaps["room"],
): Promise<ServerResponse> {
  return doServerActionWithAuth(
    [
      `servers:${serverId}:moderator`,
      `servers:${serverId}:admin`,
      `group:servers:${serverId}:moderator`,
      `group:servers:${serverId}:admin`,
    ],
    async (session) => {
      const fileManager = await getFileManager(serverId);
      if (!fileManager?.health) {
        await logAudit(
          session.user.id,
          serverId,
          "server.nadeo.room.add",
          JSON.parse(JSON.stringify(room)),
          "File manager is not healthy",
        );
        throw new Error("File manager is not healthy");
      }

      const addResults = await Promise.allSettled(
        room.mapObjects.map((map) => {
          if (!map?.fileUrl) {
            return Promise.reject(
              new Error(`Map ${map.uid} does not have a valid download URL`),
            );
          }
          return addMapToServer(serverId, map.fileUrl, map.fileName);
        }),
      );

      let errors = 0;
      addResults.forEach((result, index) => {
        if (result.status === "rejected") {
          errors++;
          console.error(`Failed to add map ${index + 1}:`, result.reason);
        }
      });

      await logAudit(
        session.user.id,
        serverId,
        "server.nadeo.room.add",
        JSON.parse(JSON.stringify(room)),
        errors > 0 ? `Failed to add ${errors} maps` : undefined,
      );

      if (errors > 0) {
        throw new Error(`Failed to add ${errors} maps`);
      }
    },
  );
}
