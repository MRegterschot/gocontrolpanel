"use client";

import { getDbConnectionBuilder } from "@/lib/spacetimedb/connection-builder";
import { useEffect, useState } from "react";
import { useAuth, useAutoSignin } from "react-oidc-context";
import { SpacetimeDBProvider as Provider } from "spacetimedb/react";

export default function SpacetimeDBProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [builder, setBuilder] = useState<Awaited<
    ReturnType<typeof getDbConnectionBuilder>
  > | null>(null);

  const auth = useAuth();

  useAutoSignin();

  useEffect(() => {
    let active = true;

    const token = auth.user?.id_token;
    if (!token) {
      return;
    }

    (async () => {
      const b = await getDbConnectionBuilder(token);
      if (!active) return;

      if (!b) {
        return;
      }

      setBuilder(b);
    })();

    return () => {
      active = false;
    };
  }, [auth.user?.id_token]);

  if (!builder) return null;

  return <Provider connectionBuilder={builder}>{children}</Provider>;
}
