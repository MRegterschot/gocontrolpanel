import { Config } from "@/types/config";
import { DEFAULT_MARKETPLACE_INDEX_URL } from "@gcp/shared";
import "dotenv/config";

const config: Config = {
  NODE_ENV: process.env.NODE_ENV || "development",
  HETZNER: {
    URL: "https://api.hetzner.cloud/v1",
    KEY: process.env.HETZNER_KEY || "",
  },
  ECM: {
    URL: "https://us-central1-fantasy-trackmania.cloudfunctions.net",
  },
  DEFAULT_ADMINS: process.env.DEFAULT_ADMINS
    ? process.env.DEFAULT_ADMINS.split(",")
    : [],
  DEFAULT_PERMISSIONS: process.env.DEFAULT_PERMISSIONS
    ? process.env.DEFAULT_PERMISSIONS.split(",")
    : [],
  NADEO: {
    CLIENT_ID: process.env.NADEO_CLIENT_ID || "",
    CLIENT_SECRET: process.env.NADEO_CLIENT_SECRET || "",
    REDIRECT_URI: process.env.NADEO_REDIRECT_URI || "",
    SERVER_LOGIN: process.env.NADEO_SERVER_LOGIN || "",
    SERVER_PASSWORD: process.env.NADEO_SERVER_PASSWORD || "",
    CONTACT: process.env.NADEO_CONTACT || "",
  },
  REDISURI: process.env.REDIS_URI || "",
  GBX_SERVICE: {
    // Reached by the web server only
    URL: process.env.GBX_SERVICE_URL || "http://localhost:3100",
    // Reached by the browser for live updates
    WS_URL: process.env.GBX_SERVICE_WS_URL || "ws://localhost:3100",
    TOKEN: process.env.GBX_SERVICE_TOKEN || "",
    WS_TICKET_SECRET: process.env.WS_TICKET_SECRET || "",
  },
  // Encrypts API keys stored in the database
  SECRETS_KEY: process.env.SECRETS_KEY || "",
  CODRIVER: {
    // Shared with the GBX service, which forwards /co chat commands; empty turns Codriver off
    INTERNAL_TOKEN: process.env.PANEL_INTERNAL_TOKEN || "",
    // Development fallback for the shared key when the operator has not stored one
    API_KEY: process.env.ANTHROPIC_API_KEY || "",
  },
  MARKETPLACE: {
    INDEX_URL:
      process.env.MARKETPLACE_INDEX_URL ?? DEFAULT_MARKETPLACE_INDEX_URL,
  },
};

export default config;
