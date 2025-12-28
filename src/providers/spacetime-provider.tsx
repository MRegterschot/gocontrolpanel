"use client";

import { getDbConnectionBuilder } from "@/lib/spacetimedb/connection-builder";
import { useEffect, useState } from "react";
import { SpacetimeDBProvider as Provider } from "spacetimedb/react";

export default function SpacetimeDBProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [builder, setBuilder] = useState<Awaited<
    ReturnType<typeof getDbConnectionBuilder>
  > | null>(null);
  const [checkedEnv, setCheckedEnv] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      const b = await getDbConnectionBuilder();
      if (!active) return;

      if (!b) {
        setCheckedEnv(true);
        return;
      }

      setBuilder(b);
      setCheckedEnv(true);
    })();

    return () => {
      active = false;
    };
  }, []);

  if (!checkedEnv) return null;

  if (!builder) return <>{children}</>;

  return <Provider connectionBuilder={builder}>{children}</Provider>;
}
