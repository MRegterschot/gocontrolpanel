"use client";

import { useSpacetimeDB } from "spacetimedb/react";
import { DbConnection, DbConnectionBuilder } from "../tourney-manager";
import { onConnect, onConnectError, onDisconnect } from "./connectionHandlers";

export const SPACETIME_LOCAL_STORAGE_TOKEN_KEY = "spacetimedb_auth_token";


export const getDbConnectionBuilder = (): DbConnectionBuilder => {
  const isSSR = typeof window === "undefined";
  if (isSSR) {
    throw new Error("Cannot use SpacetimeDB on the server.");
  }

  return DbConnection.builder()
    .withUri("http://localhost:1234")
    .withModuleName("tm-tourney-manager")
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

export const disconnectDbConnection = () => {
  const spacetime = useSpacetimeDB();

  spacetime.getConnection()?.disconnect()
};
