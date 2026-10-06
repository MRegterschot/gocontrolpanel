import { doServerActionWithAuth } from "@/lib/actions";
import {
  getAccountNames,
  getClubActivities,
  getClubById,
  getClubCampaign,
  getClubCampaigns,
  getClubMembers,
  getClubRoom,
  getClubs,
} from "@/lib/api/nadeo";
import { logger } from "@/lib/logger";
import {
  getKeyClubActivities,
  getKeyClubCampaign,
  getKeyClubCampaignsPaginated,
  getKeyClubMembersCount,
  getKeyClubsPaginated,
  getRedisClient,
} from "@/lib/redis";
import { getMapsByUids } from "@/services/database/maps";
import {
  Club,
  ClubActivitiesResponse,
  ClubCampaign,
  ClubCampaignWithNamesAndPlaylistMaps,
  ClubRoomWithNamesAndMaps,
  ClubWithAccountNames,
} from "@/types/api/nadeo";
import {
  PaginationResponse,
  ServerError,
  ServerResponse,
} from "@/types/responses";
import { PaginationState } from "@tanstack/react-table";
import "server-only";

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
      const meta = {
        type: "nadeo",
        module: "campaigns",
        function: "getClubCampaignWithMaps",
      };
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
        logger.error(
          { meta, error, campaignId: campaign.id },
          "Failed to get maps",
        );
        throw new ServerError(error, "GetMapsByUidsError");
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
      const meta = {
        type: "nadeo",
        module: "clubs",
        function: "getClubRoomWithNamesAndMaps",
      };
      const clubRoom = await getClubRoom(clubId, roomId);

      const accountNames = await getAccountNames([
        clubRoom.creatorAccountId,
        clubRoom.latestEditorAccountId,
      ]);

      const { data: maps, error } = await getMapsByUids(clubRoom.room.maps);
      if (error) {
        logger.error({ meta, error, clubId, roomId }, "Failed to get maps");
        throw new ServerError(error, "GetMapsByUidsError");
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
