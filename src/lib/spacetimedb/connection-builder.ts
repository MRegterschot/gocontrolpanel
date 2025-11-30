"use client";

import config from "../config";
import { DbConnection, DbConnectionBuilder } from "../tourney-manager";
import { onConnect, onConnectError, onDisconnect } from "./connection-handlers";

export const SPACETIME_LOCAL_STORAGE_TOKEN_KEY = "spacetimedb_auth_token";

export const getDbConnectionBuilder = (): DbConnectionBuilder | null => {
  const isSSR = typeof window === "undefined";
  if (isSSR) {
    throw new Error("Cannot use SpacetimeDB on the server.");
  }

  const uri = config.SPACETIME.URI;
  const moduleName = config.SPACETIME.MODULE;

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
