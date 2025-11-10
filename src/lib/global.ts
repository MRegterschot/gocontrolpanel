import "server-only";

import { FileManager } from "@/types/filemanager";
import Redis from "ioredis";
import { GbxClientManager } from "./managers/gbxclient-manager";
import ManialinkManager from "./managers/manialink-manager";
import PluginManager from "./managers/plugin-manager";
import { PrismaClient } from "./prisma/generated";

type GlobalState = {
  prisma?: PrismaClient;
  redis?: Redis;
  gbxClients?: Record<string, GbxClientManager>;
  manialinkManagers?: Record<string, ManialinkManager>;
  pluginManagers?: Record<string, PluginManager>;
  fileManagers?: Record<string, FileManager>;
};

const globalState = globalThis as unknown as { __appGlobals__?: GlobalState };

if (!globalState.__appGlobals__) {
  globalState.__appGlobals__ = {
    gbxClients: {},
    pluginManagers: {},
    manialinkManagers: {},
    fileManagers: {},
  };
}

export const appGlobals = globalState.__appGlobals__!;
