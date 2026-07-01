"use client";

import { AuthProvider, AuthProviderProps } from "react-oidc-context";
import SpacetimeDBProvider from "./spacetime-provider";

const oidcConfig: AuthProviderProps = {
  authority: "https://auth.spacetimedb.com/oidc",
  client_id: process.env.NEXT_PUBLIC_SPACETIME_CLIENT_ID || "",
  scope: "openid profile email offline_access",
  response_type: "code",
  redirect_uri: typeof window !== "undefined" ? window.location.origin : "",
  post_logout_redirect_uri:
    typeof window !== "undefined" ? window.location.origin : "",
  automaticSilentRenew: true,
};

function onSigninCallback() {
  window.history.replaceState({}, document.title, window.location.pathname);
}

export default function SpacetimeAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  if (
    !process.env.NEXT_PUBLIC_SPACETIME_URI ||
    !process.env.NEXT_PUBLIC_SPACETIME_MODULE
  ) {
    return <>{children}</>;
  }

  return (
    <AuthProvider {...oidcConfig} onSigninCallback={onSigninCallback}>
      <SpacetimeDBProvider>{children}</SpacetimeDBProvider>
    </AuthProvider>
  );
}
