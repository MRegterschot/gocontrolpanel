"use client";

import { useAuth, useAutoSignin } from "react-oidc-context";

export default function Page() {
  const auth = useAuth();

  useAutoSignin();

  if (auth.isLoading) {
    return <div>Loading...</div>;
  }

  if (auth.error) {
    console.error('OIDC Error:', auth.error);
    return <div>Error: {auth.error.message}</div>;
  }

  if (!auth.isAuthenticated) {
    return <div>Redirecting to login...</div>;
  }

  console.log('[OIDC] Authenticated user:', auth);

  return (
    <div className="App">
      <header className="App-header">
        Welcome, {auth.user?.profile.name} (id: {auth.user?.profile.sub})!
        <button onClick={() => auth.signoutRedirect()}>Sign Out</button>
      </header>
    </div>
  );
}
