import "server-only";

import { FileManager } from "@/types/filemanager";
import Redis from "ioredis";
import { GbxClientManager } from "./managers/gbxclient-manager";
import { PrismaClient } from "./prisma/generated";

type GlobalState = {
  prisma?: PrismaClient;
  redis?: Redis;
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
