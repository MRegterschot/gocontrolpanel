"use client";

import { DbConnection } from "tm-tourney-manager-api-ts";
import { cleanupConnectionListener } from "./connectionEvents";
import { onConnect, onConnectError, onDisconnect } from "./connectionHandlers";
import { cleanupSubscriptionListener } from "./subscriptionEvents";

export const SPACETIME_LOCAL_STORAGE_TOKEN_KEY = "spacetimedb_auth_token";

let singletonConnection: DbConnection | null = null;

export const getDbConnection = (): DbConnection => {
  const isSSR = typeof window === "undefined";
  if (isSSR) {
    throw new Error("Cannot use SpacetimeDB on the server.");
  }

  if (singletonConnection) {
    return singletonConnection;
  }

  singletonConnection = buildDbConnection();
  return singletonConnection;
};

const buildDbConnection = () => {
  return DbConnection.builder()
    .withUri("http://localhost:1234")
    .withModuleName("tm-tourney-manager")
    .withToken(getAuthToken())
    .onConnect(onConnect)
    .onDisconnect(onDisconnect)
    .onConnectError(onConnectError)
    .build();
};

const getAuthToken = () => {
  const token = localStorage.getItem(SPACETIME_LOCAL_STORAGE_TOKEN_KEY);
  if (token) return token;
  return "";
};

export const disconnectDbConnection = () => {
  if (singletonConnection) {
    singletonConnection.disconnect();
    singletonConnection = null;
  }
  cleanupConnectionListener();
  cleanupSubscriptionListener();
};
