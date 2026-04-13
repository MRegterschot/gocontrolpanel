"use client";

import { AuthProvider } from "react-oidc-context";

const oidcConfig = {
  authority: "https://auth.spacetimedb.com/oidc",
  client_id: process.env.NEXT_PUBLIC_SPACETIME_CLIENT_ID,
  redirect_uri: window.location.origin, // Where the user is redirected after login
  post_logout_redirect_uri: window.location.origin, // Where the user is redirected after logout
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
  return (
    <AuthProvider {...oidcConfig} onSigninCallback={onSigninCallback}>
      {children}
    </AuthProvider>
  );
}
