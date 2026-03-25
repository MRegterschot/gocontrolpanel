import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ServerClient } from "@/types/server";
import { IconPlugConnected, IconPlugConnectedX } from "@tabler/icons-react";
import { useEffect, useState } from "react";

export default function ClientCard({ client }: { client: ServerClient }) {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!client.isReconnecting) return;

    const interval = setInterval(() => {
      forceUpdate((x) => x + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [client.isReconnecting]);

  let timeRemaining: number | null = null;

  if (client.reconnectingAt !== null) {
    timeRemaining = client.reconnectingAt - Date.now();
  }

  return (
    <Card className="p-4 flex flex-col gap-4">
      <div className="flex gap-4">
        <h3 className="text-lg font-semibold">{client.name}</h3>

        <div className="flex gap-2 ml-auto">
          {client.isReconnecting && (
            <Badge variant="outline">
              {timeRemaining !== null &&
                (timeRemaining > 0 ? (
                  <p>Reconnecting in: {Math.ceil(timeRemaining / 1000)}s</p>
                ) : (
                  <p>Reconnecting...</p>
                ))}
            </Badge>
          )}
          <Badge variant={client.isConnected ? "default" : "destructive"}>
            {client.isConnected ? (
              <>
                <IconPlugConnected className="inline" />
                Connected
              </>
            ) : (
              <>
                <IconPlugConnectedX className="inline" />
                Disconnected
              </>
            )}
          </Badge>
        </div>
      </div>

      <div>
        <Button variant="outline" disabled={!client.isReconnecting}>
          Stop Reconnecting
        </Button>
      </div>
    </Card>
  );
}
