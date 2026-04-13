import "server-only";
import { appGlobals } from "./global";
import { logger } from "./logger";
import { PrismaClient } from "./prisma/generated";

export function getClient(): PrismaClient {
  if (!appGlobals.prisma) {
    try {
      appGlobals.prisma = new PrismaClient({
        errorFormat: "minimal",
      });
      logger.info("Prisma client initialized");
      return appGlobals.prisma;
    } catch (error) {
      if (process.env.NODE_ENV === "production") {
        logger.warn("Prisma not available during build, continuing...");
      } else {
        logger.error(error, "Error connecting to Prisma");
        throw new Error("Failed to connect to Prisma");
      }
    }
  }

  if (!appGlobals.prisma) {
    throw new Error("Prisma client is not initialized");
  }

  return appGlobals.prisma;
}
