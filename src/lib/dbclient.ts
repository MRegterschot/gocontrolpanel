import "server-only";
import { appGlobals } from "./global";
import { logger } from "./logger";
import { PrismaClient } from "./prisma/generated";

export function getClient(): PrismaClient {
  if (!appGlobals.prisma) {
    const meta = {
      type: "server",
      module: "dbclient",
      function: "getClient",
    };
    try {
      appGlobals.prisma = new PrismaClient({
        errorFormat: "minimal",
      });
      logger.info({ meta }, "Prisma client initialized");
      return appGlobals.prisma;
    } catch (error) {
      if (process.env.NODE_ENV === "production") {
        logger.warn(
          { meta },
          "Prisma not available during build, continuing...",
        );
      } else {
        logger.error({ meta, error }, "Error connecting to Prisma");
        throw new Error("Failed to connect to Prisma");
      }
    }
  }

  if (!appGlobals.prisma) {
    throw new Error("Prisma client is not initialized");
  }

  return appGlobals.prisma;
}
