import pino from "pino";

// TEST_LOG_LEVEL=debug shows the service logs while debugging a test
export const silentLogger = pino({ level: process.env.TEST_LOG_LEVEL ?? "silent" });
