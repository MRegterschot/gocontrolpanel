"use client";

import config from "@/lib/config";
import { getDbConnectionBuilder } from "@/lib/spacetimedb/connection-builder";
import { useEffect, useState } from "react";
import { SpacetimeDBProvider as BuiltinSpacetimeDbProvider } from "spacetimedb/react";

const SpacetimeDBProvider = ({ children }: { children: React.ReactNode }) => {
  const [builder, setBuilder] = useState<ReturnType<
    typeof getDbConnectionBuilder
  > | null>(null);

  useEffect(() => {
    setBuilder(getDbConnectionBuilder());
  }, []);

  if (!config.SPACETIME.URI || !config.SPACETIME.MODULE) {
    return <>{children}</>;
  }

  if (!builder) {
    return null;
  }

  return (
    // @ts-expect-error - types are wrong in spacetimedb package
    <BuiltinSpacetimeDbProvider connectionBuilder={builder}>
      {children}
    </BuiltinSpacetimeDbProvider>
  );
};

export default SpacetimeDBProvider;
