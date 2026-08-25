import { ServerError } from "@/types/responses";
import { PaginationState } from "@tanstack/react-table";
import Redis from "ioredis";
import "server-only";
import config from "./config";
import { appGlobals } from "./global";
import { logger } from "./logger";
import { reportException } from "./sentry/report";

export async function getRedisClient() {
  if (!appGlobals.redis) {
    const meta = {
      type: "server",
      module: "redis",
      function: "getRedisClient",
    };
    try {
      appGlobals.redis = new Redis(config.REDISURI, {
        retryStrategy: () => null,
        maxRetriesPerRequest: 1,
        reconnectOnError: () => false,
      });

      logger.info({ meta }, "Redis client initialized");
      return appGlobals.redis;
    } catch (error) {
      if (process.env.NODE_ENV === "production") {
        logger.warn(
          { meta },
          "Redis not available during build, continuing...",
        );
      } else {
        logger.error({ meta, error }, "Error connecting to Redis");
        reportException(error, meta);
        throw new ServerError(
          "Failed to connect to Redis",
          "RedisConnectionError",
        );
      }
    }
  }

  if (!appGlobals.redis) {
    const error = new ServerError(
      "Redis client not initialized",
      "RedisClientNotInitialized",
    );
    reportException(error);
    throw error;
  }

  return appGlobals.redis;
}

/**
 * Dedicated connection for pub/sub. A subscribed ioredis connection rejects
 * ordinary commands, so this must stay separate from `getRedisClient`.
 */
export async function getRedisSubscriber() {
  if (!appGlobals.redisSubscriber) {
    const meta = {
      type: "server",
      module: "redis",
      function: "getRedisSubscriber",
    };

    const subscriber = new Redis(config.REDISURI, {
      retryStrategy: (times) => Math.min(times * 500, 10_000),
      maxRetriesPerRequest: null,
    });

    subscriber.on("error", (error) => {
      // Never throw from here: a dropped subscriber degrades fan-out to
      // single-instance delivery, it does not break the live feed.
      logger.warn({ meta, error }, "Redis subscriber error");
    });

    const { attachSubscriberDispatch } = await import("./events/server-events");
    attachSubscriberDispatch(subscriber);

    appGlobals.redisSubscriber = subscriber;
    logger.info({ meta }, "Redis subscriber initialized");
  }

  return appGlobals.redisSubscriber;
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

export const getKeyPublicManialinks = (serverId: string) =>
  `${serverId}:manialinks:public`;
export const getKeyPlayerManialinks = (serverId: string, login: string) =>
  `${serverId}:manialinks:player:${login}`;
