"use client";

import ClientCard from "@/components/servers/clients/client-card";
import useWebSocket from "@/hooks/use-websocket";
import { ServerClient } from "@/types/server";
import { useCallback, useState } from "react";

export default function AdminServerClientsPage() {
  const [clients, setClients] = useState<ServerClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleMessage = useCallback((type: string, data: any) => {
    switch (type) {
      case "clients":
        setClients(data);
        setIsLoading(false);
        break;
      case "connect":
        setClients((prev) =>
          prev.map((c) =>
            c.serverId === data.serverId
              ? {
                  ...c,
                  isConnected: true,
                  isReconnecting: false,
                  reconnectingAt: null,
                }
              : c,
          ),
        );
        break;
      case "disconnect":
        setClients((prev) =>
          prev.map((c) =>
            c.serverId === data.serverId ? { ...c, isConnected: false } : c,
          ),
        );
        break;
      case "reconnect":
        switch (data.type) {
          case "try":
            setClients((prev) =>
              prev.map((c) =>
                c.serverId === data.serverId
                  ? {
                      ...c,
                      isReconnecting: true,
                      reconnectingAt: data.time,
                    }
                  : c,
              ),
            );
            break;
          case "stop":
            setClients((prev) =>
              prev.map((c) =>
                c.serverId === data.serverId
                  ? { ...c, isReconnecting: false, reconnectingAt: null }
                  : c,
              ),
            );
            break;
        }
    }
  }, []);

  useWebSocket({
    url: "/api/ws/clients",
    onMessage: handleMessage,
  });

  if (isLoading && clients.length === 0) {
    return <div>Loading...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-4">
      {clients.map((client) => (
        <ClientCard key={client.serverId} client={client} />
      ))}
    </div>
  );
}
