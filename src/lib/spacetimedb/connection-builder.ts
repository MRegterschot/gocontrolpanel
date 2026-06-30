"use client";

import { DbConnection, DbConnectionBuilder } from "../server-manager";
import { onConnect, onConnectError, onDisconnect } from "./connection-handlers";

export const SPACETIME_LOCAL_STORAGE_TOKEN_KEY = "spacetimedb_auth_token";

export const getDbConnectionBuilder = async (
  token: string,
): Promise<DbConnectionBuilder | null> => {
  const isSSR = typeof window === "undefined";
  if (isSSR) {
    throw new Error("Cannot use SpacetimeDB on the server.");
  }

  const uri = process.env.NEXT_PUBLIC_SPACETIME_URI;
  const moduleName = process.env.NEXT_PUBLIC_SPACETIME_MODULE;

  if (!uri || !moduleName) return null;

  return DbConnection.builder()
    .withUri(uri)
    .withDatabaseName(moduleName)
    .withToken(token)
    .onConnect(onConnect)
    .onDisconnect(onDisconnect)
    .onConnectError(onConnectError);
};
