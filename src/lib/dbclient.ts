import "server-only";
import { appGlobals } from "./global";
import { logger } from "./logger";
import { PrismaClient } from "./prisma/generated";
import { ServerError } from "@/types/responses";

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
        throw new ServerError("Failed to connect to Prisma", "PrismaConnectionError");
      }
    }
  }

  if (!appGlobals.prisma) {
    throw new ServerError("Prisma client is not initialized", "PrismaClientNotInitialized");
  }

  return appGlobals.prisma;
}
