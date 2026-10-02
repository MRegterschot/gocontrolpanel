import { Config } from "@/types/config";
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
};

export default config;
