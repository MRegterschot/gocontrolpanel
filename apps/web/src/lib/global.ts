import "server-only";

import { FileManager } from "@/types/filemanager";
import Redis from "ioredis";
import { PrismaClient } from "@tmcp/db";

type GlobalState = {
  prisma?: PrismaClient;
  redis?: Redis;
  fileManagers?: Record<string, FileManager>;
};

const globalState = globalThis as unknown as { __appGlobals__?: GlobalState };

if (!globalState.__appGlobals__) {
  globalState.__appGlobals__ = {
    fileManagers: {},
  };
}

export const appGlobals = globalState.__appGlobals__!;
