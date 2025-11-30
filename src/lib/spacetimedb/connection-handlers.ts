import { Identity } from "spacetimedb";
import { DbConnection, ErrorContext } from "../tourney-manager";
import { SPACETIME_LOCAL_STORAGE_TOKEN_KEY } from "./connection-builder";

export const onConnect = (
  _conn: DbConnection,
  _identity: Identity,
  token: string,
) => {
  console.log("[SpacetimeDB] Connection established.");
  localStorage.setItem(SPACETIME_LOCAL_STORAGE_TOKEN_KEY, token);
};

export const onDisconnect = () => {
  //TODO what should happen?
  console.log("[SpacetimeDB] Connection closed.");
};

export const onConnectError = (_: ErrorContext, error: Error) => {
  //TODO what should happen?
  console.log(
    "[SpacetimeDB] Connection couldnt be establised because of:.",
    error,
  );

  localStorage.removeItem(SPACETIME_LOCAL_STORAGE_TOKEN_KEY);
};
