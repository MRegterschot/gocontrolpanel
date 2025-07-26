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