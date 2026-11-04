"use client";

import { AuthProvider, AuthProviderProps } from "react-oidc-context";
//import { WebStorageStateStore } from "oidc-client-ts";
import config from "@/lib/config";

const oidcConfig: AuthProviderProps = {
  authority: "https://auth.spacetimedb.com/oidc",
  client_id: config.TMSERVERS.CLIENT_ID,
  scope: "openid profile email offline_access",
  response_type: "code",
  redirect_uri: typeof window !== "undefined" ? window.location.origin : "",
  post_logout_redirect_uri:
    typeof window !== "undefined" ? window.location.origin : "",
  automaticSilentRenew: true,
  //userStore: new WebStorageStateStore({ store: typeof window !== "undefined" ? window.localStorage : undefined }),
};

function onSigninCallback() {
  window.history.replaceState({}, document.title, window.location.pathname);
}

import dynamic from 'next/dynamic';

export const SpacetimeDBProvider = dynamic(
  () => import('./spacetime-provider'),
  { ssr: false }
);

export default function SpacetimeAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  if (
    config.TMSERVERS.DISABLED
  ) {
    return <>{children}</>;
  }

  return (
    <AuthProvider {...oidcConfig} onSigninCallback={onSigninCallback}>
      <SpacetimeDBProvider>{children}</SpacetimeDBProvider>
    </AuthProvider>
  );
}
