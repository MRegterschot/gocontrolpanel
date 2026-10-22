"use client";

import config from "../config";
import { DbConnection, DbConnectionBuilder } from "../server-manager";
import { onConnect, onConnectError, onDisconnect } from "./connection-handlers";

export const SPACETIME_LOCAL_STORAGE_TOKEN_KEY = "spacetimedb_auth_token";

export const getDbConnectionBuilder = (
  token?: string,
): DbConnectionBuilder | null => {
  const isSSR = typeof window === "undefined";
  if (isSSR) {
    throw new Error("Cannot use SpacetimeDB on the server.");
  }

  const uri = config.TMSERVERS.URI;
  const moduleName = config.TMSERVERS.MODULE;

  if (!uri || !moduleName || !token) return null;

  return DbConnection.builder()
    .withUri(uri)
    .withDatabaseName(moduleName)
    .withToken(token)
    .onConnect(onConnect)
    .onDisconnect(onDisconnect)
    .onConnectError(onConnectError);
};
