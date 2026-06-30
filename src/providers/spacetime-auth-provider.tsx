"use client";

import { AuthProvider } from "react-oidc-context";
import SpacetimeDBProvider from "./spacetime-provider";

const oidcConfig = {
  authority: "https://auth.spacetimedb.com/oidc",
  client_id: process.env.NEXT_PUBLIC_SPACETIME_CLIENT_ID,
  scope: "openid profile email",
  response_type: "code",
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
    <AuthProvider
      redirect_uri={window.location.origin}
      post_logout_redirect_uri={window.location.origin}
      {...oidcConfig}
      onSigninCallback={onSigninCallback}
    >
      <SpacetimeDBProvider>{children}</SpacetimeDBProvider>
    </AuthProvider>
  );
}
