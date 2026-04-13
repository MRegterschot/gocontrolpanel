"use client";

import useWebSocket from "@/hooks/use-websocket";
import { getCurrentId } from "@/lib/utils";
import { connectionRoutes } from "@/routes";
import { ServerInfo } from "@/types/server";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";

interface ServersContextType {
  servers: ServerInfo[];
  serverId: string | null;
  loading: boolean;
}

const ServersContext = createContext<ServersContextType | null>(null);

export const useServers = () => {
  const ctx = useContext(ServersContext);
  if (!ctx) {
    throw new Error("useServers must be used within a ServersProvider");
  }
  return ctx;
};

export const ServersProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const pathname = usePathname();
  const router = useRouter();

  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverId, setServerId] = useState<string | null>(null);

  const handleMessage = useCallback((type: string, data: any) => {
    switch (type) {
      case "servers":
        setServers(data);
        setLoading(false);
        break;
      case "connect":
        setServers((prev) =>
          prev.map((server) =>
            server.id === data.serverId
              ? { ...server, isConnected: true }
              : server,
          ),
        );
        break;
      case "disconnect":
        setServers((prev) =>
          prev.map((server) =>
            server.id === data.serverId
              ? { ...server, isConnected: false }
              : server,
          ),
        );
        break;
    }
  }, []);

  useEffect(() => {
    const uuid = getCurrentId(pathname);
    setServerId(uuid);
  }, [pathname]);

  const isConnectionRoute = (serverId: string) =>
    connectionRoutes.some((route) => {
      const routePattern = route.replace(":id", serverId);
      return pathname.startsWith(routePattern);
    });

  useEffect(() => {
    for (const server of servers) {
      if (
        server.id === serverId &&
        !server.isConnected &&
        isConnectionRoute(server.id)
      ) {
        toast.error(`Server ${server.name} is offline`);
        router.push("/");
      }
    }
  }, [servers, router, serverId]);

  useWebSocket({
    url: "/api/ws/servers",
    onMessage: handleMessage,
    onError: () => setLoading(false),
  });

  return (
    <ServersContext.Provider value={{ servers, serverId, loading }}>
      {children}
    </ServersContext.Provider>
  );
};
