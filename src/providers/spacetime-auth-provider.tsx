"use client";

import { useEffect, useState } from "react";
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
  const [checkedEnv, setCheckedEnv] = useState(false);
  const [isEnvValid, setIsEnvValid] = useState(false);

  useEffect(() => {
    async function checkEnv() {
      const res = await fetch("/api/env");
      const data = await res.json();

      if (data.SPACETIME_URI && data.SPACETIME_MODULE) {
        setIsEnvValid(true);
      }
      setCheckedEnv(true);
    }

    checkEnv();
  }, []);

  if (!checkedEnv) return null;

  if (!isEnvValid) {
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
