import {
  connectionStatus,
  notifyConnectionDisconnected,
  notifyConnectionError,
  notifyConnectionEstablished,
} from "@/lib/spacetimedb/connectionEvents";
import {
  notifySubscriptionApplied,
  notifySubscriptionError,
} from "@/lib/spacetimedb/subscriptionEvents";
import { Identity } from "spacetimedb";
import { DbConnection, ErrorContext } from "tm-tourney-manager-api-ts";
import { SPACETIME_LOCAL_STORAGE_TOKEN_KEY } from "./connection";

export const onConnect = (
  conn: DbConnection,
  identity: Identity,
  token: string,
) => {
  connectionStatus.isConnected = true;
  connectionStatus.error = null;
  connectionStatus.identity = identity;
  localStorage.setItem(SPACETIME_LOCAL_STORAGE_TOKEN_KEY, token);

  notifyConnectionEstablished();
  subscribeToQueries(conn, ["SELECT * FROM tournament"]);
};

export const onDisconnect = () => {
  connectionStatus.isConnected = false;
  connectionStatus.isSubscribed = false;
  notifyConnectionDisconnected();
};

export const onConnectError = (_: ErrorContext, error: Error) => {
  connectionStatus.isConnected = false;
  connectionStatus.isSubscribed = false;
  connectionStatus.error = error;
  notifyConnectionError();
};

export const subscribeToQueries = (conn: DbConnection, queries: string[]) => {
  conn
    ?.subscriptionBuilder()
    .onApplied(() => {
      connectionStatus.isSubscribed = true;
      notifySubscriptionApplied();
    })
    .onError((ctx: ErrorContext) => {
      connectionStatus.isSubscribed = false;
      notifySubscriptionError();
    })
    .subscribe(queries);
};
