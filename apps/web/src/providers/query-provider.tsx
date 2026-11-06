"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  // Per mount, so one visitor's cache is never shared with another on the server
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // A failed read is almost always a stopped server or a missing permission,
            // which a retry won't fix, and each retry would hold the page up longer
            retry: false,
            // Reads hit a game server through the GBX service; don't repeat them on every tab switch
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
