"use client";

import { getDbConnectionBuilder } from "@/lib/spacetimedb/connection-builder";
import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { SpacetimeDBProvider as Provider } from "spacetimedb/react";

export default function SpacetimeDBProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [builder, setBuilder] = useState<ReturnType<
    typeof getDbConnectionBuilder
  > | null>(null);

  const auth = useAuth();

  useEffect(() => {
    const token = auth.user?.id_token;
    const b = getDbConnectionBuilder(token);
    setBuilder(b);
  }, [auth.user?.id_token]);

  if (!builder) return null;

  return <Provider connectionBuilder={builder}>{children}</Provider>;
}
