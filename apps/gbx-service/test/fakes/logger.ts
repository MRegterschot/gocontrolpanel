import pino from "pino";

export const silentLogger = pino({ level: "silent" });
