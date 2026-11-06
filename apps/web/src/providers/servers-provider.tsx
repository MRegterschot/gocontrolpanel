"use client";

import useWebSocket from "@/hooks/use-websocket";
import { serverStatusToast } from "@/lib/server-status-toast";
import { getCurrentId } from "@/lib/utils";
import { connectionRoutes } from "@/routes";
import { ServerError } from "@/types/responses";
import { ServerInfo, wsPaths } from "@tmcontrolpanel/shared";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
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
    throw new ServerError(
      "useServers must be used within a ServersProvider",
      "UseServersError",
    );
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

  const serversRef = useRef(servers);
  serversRef.current = servers;
  const snapshotAt = useRef(0);

  const handleMessage = useCallback((type: string, data: any) => {
    if (type === "servers") snapshotAt.current = Date.now();
    const server = serversRef.current.find((s) => s.id === data?.serverId);
    if (server) {
      const notification = serverStatusToast(
        type,
        server.name,
        data.kind,
        snapshotAt.current,
        Date.now(),
      );
      if (notification)
        toast[notification.level](notification.message, {
          id: `server-status-${server.id}`,
          description: notification.description,
        });
    }
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
    path: wsPaths.servers,
    onMessage: handleMessage,
    onOpen: () => {
      snapshotAt.current = 0;
    },
    onError: () => setLoading(false),
  });

  return (
    <ServersContext.Provider value={{ servers, serverId, loading }}>
      {children}
    </ServersContext.Provider>
  );
};
