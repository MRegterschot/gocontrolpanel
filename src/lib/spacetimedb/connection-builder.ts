"use client";

import { DbConnection, DbConnectionBuilder } from "../tourney-manager";
import { onConnect, onConnectError, onDisconnect } from "./connection-handlers";

export const SPACETIME_LOCAL_STORAGE_TOKEN_KEY = "spacetimedb_auth_token";

type SpacetimeConfig = {
  SPACETIME_URI: string | null;
  SPACETIME_MODULE: string | null;
};

let runtimeConfig: SpacetimeConfig | null = null;

export const getDbConnectionBuilder =
  async (): Promise<DbConnectionBuilder | null> => {
    const isSSR = typeof window === "undefined";
    if (isSSR) {
      throw new Error("Cannot use SpacetimeDB on the server.");
    }

    if (!runtimeConfig) {
      const res = await fetch("/api/env");
      const data = await res.json();

      runtimeConfig = {
        SPACETIME_URI: data.SPACETIME_URI ?? null,
        SPACETIME_MODULE: data.SPACETIME_MODULE ?? null,
      };
    }

    const uri = runtimeConfig.SPACETIME_URI;
    const moduleName = runtimeConfig.SPACETIME_MODULE;

    if (!uri || !moduleName) return null;

    return DbConnection.builder()
      .withUri(uri)
      .withModuleName(moduleName)
      .withToken(getAuthToken())
      .onConnect(onConnect)
      .onDisconnect(onDisconnect)
      .onConnectError(onConnectError);
  };

const getAuthToken = () => {
  const token = localStorage.getItem(SPACETIME_LOCAL_STORAGE_TOKEN_KEY);
  if (token) return token;
  return "";
};
