import "server-only";

import { FileManager } from "@/types/filemanager";
import Redis from "ioredis";
import { GbxClientManager } from "./managers/gbxclient-manager";
import { PrismaClient } from "./prisma/generated";

type GlobalState = {
  prisma?: PrismaClient;
  redis?: Redis;
  /**
   * Separate connection for pub/sub. ioredis puts a connection into subscriber
   * mode, after which it cannot run ordinary commands, so this cannot share the
   * client above.
   */
  redisSubscriber?: Redis;
  gbxClients?: Record<string, GbxClientManager>;
  fileManagers?: Record<string, FileManager>;
};

const globalState = globalThis as unknown as { __appGlobals__?: GlobalState };

if (!globalState.__appGlobals__) {
  globalState.__appGlobals__ = {
    gbxClients: {},
    fileManagers: {},
  };
}

export const appGlobals = globalState.__appGlobals__!;
