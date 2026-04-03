"use client";

import { DbConnection, DbConnectionBuilder } from "../server-manager";
import { onConnect, onConnectError, onDisconnect } from "./connection-handlers";

export const SPACETIME_LOCAL_STORAGE_TOKEN_KEY = "spacetimedb_auth_token";

type SpacetimeConfig = {
  SPACETIME_URI: string | null;
  SPACETIME_MODULE: string | null;
};

let runtimeConfig: SpacetimeConfig | null = null;

export const getDbConnectionBuilder = async (
  token: string,
): Promise<DbConnectionBuilder | null> => {
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
    .withDatabaseName(moduleName)
    .withToken(token)
    .onConnect(onConnect)
    .onDisconnect(onDisconnect)
    .onConnectError(onConnectError);
};
