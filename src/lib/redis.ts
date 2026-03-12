import { PaginationState } from "@tanstack/react-table";
import Redis from "ioredis";
import "server-only";
import config from "./config";
import { appGlobals } from "./global";

export async function getRedisClient() {
  if (!appGlobals.redis) {
    try {
      appGlobals.redis = new Redis(config.REDISURI, {
        retryStrategy: () => null,
        maxRetriesPerRequest: 1,
        reconnectOnError: () => false,
      });

      console.log("Redis client initialized");
      return appGlobals.redis;
    } catch (error) {
      if (process.env.NODE_ENV === "production") {
        console.warn("Redis not available during build, continuing...");
      } else {
        console.error("Error connecting to Redis:", error);
        throw new Error("Failed to connect to Redis");
      }
    }
  }

  if (!appGlobals.redis) {
    throw new Error("Redis client is not initialized");
  }

  return appGlobals.redis;
}

export const getKeyActiveMap = (serverId: string) => `active-map:${serverId}`;
export const getKeyJukebox = (serverId: string) => `jukebox:${serverId}`;
export const getKeyHetznerRateLimit = (projectId: string) =>
  `hetzner:rate-limit:${projectId}`;
export const getKeyHetznerServerTypes = () => "hetzner:server-types";
export const getKeyHetznerImages = () => "hetzner:images";
export const getKeyHetznerLocations = () => "hetzner:locations";
export const getKeyHetznerRecentlyCreatedServers = (projectId: string) =>
  `hetzner:recently-created-servers:${projectId}`;
export const getKeyTotdMonth = (offset: number) => `totd:month:${offset}`;
export const getKeySeasonalCampaigns = () => `nadeo:seasonal-campaigns`;
export const getKeyCampaign = (campaignId: number) =>
  `nadeo:campaign:${campaignId}`;
export const getKeyWeeklyShorts = () => `nadeo:weekly-shorts`;
export const getKeyClubCampaignsPaginated = (
  pagination: PaginationState,
  filter?: string,
) => {
  let key = `nadeo:club-campaigns:page=${pagination.pageIndex}:size=${pagination.pageSize}`;
  if (filter) {
    key += `:filter=${filter}`;
  }
  return key;
};
export const getKeyClubsPaginated = (
  pagination: PaginationState,
  filter?: string,
) => {
  let key = `nadeo:clubs:page=${pagination.pageIndex}:size=${pagination.pageSize}`;
  if (filter) {
    key += `:filter=${filter}`;
  }
  return key;
};
export const getKeyClubActivitiesPaginated = (
  clubId: number,
  pagination: PaginationState,
) =>
  `nadeo:club:${clubId}:activities:page=${pagination.pageIndex}:size=${pagination.pageSize}`;
export const getKeyClubActivities = (clubId: number, offset: number) =>
  `nadeo:club:${clubId}:activities:offset=${offset}`;
export const getKeyClubCampaign = (clubId: number, campaignId: number) =>
  `nadeo:club:${clubId}:campaign:${campaignId}`;
export const getKeyAccountNames = () => `nadeo:account-names`;
export const getKeyClubMembersPaginated = (
  clubId: number,
  pagination: PaginationState,
) =>
  `nadeo:club:${clubId}:members:page=${pagination.pageIndex}:size=${pagination.pageSize}`;
export const getKeyClubMembersCount = (clubId: number) =>
  `nadeo:club:${clubId}:members:count`;
export const getKeyUserInfo = (login: string) => `users:user-info:${login}`;
