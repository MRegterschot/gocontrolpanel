import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
});

export const getLogger = (serverId: string) => logger.child({ serverId });
