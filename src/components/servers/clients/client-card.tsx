import { stopReconnect, triggerReconnect } from "@/actions/gbx/clients";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getErrorMessage } from "@/lib/utils";
import { ServerClient } from "@/types/server";
import { IconPlugConnected, IconPlugConnectedX } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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

  const handleStopReconnect = async () => {
    try {
      const { data, error } = await stopReconnect(client.serverId);
      if (error) {
        throw new Error(error);
      }

      toast.success(`Stopped reconnecting to ${client.name}`);
    } catch (err) {
      toast.error(`Failed to stop reconnecting to ${client.name}`, {
        description: getErrorMessage(err),
      });
    }
  };

  const handleTriggerReconnect = async () => {
    try {
      const { data, error } = await triggerReconnect(client.serverId);
      if (error) {
        throw new Error(error);
      }

      toast.success(`Triggered reconnect to ${client.name}`);
    } catch (err) {
      toast.error(`Failed to trigger reconnect to ${client.name}`, {
        description: getErrorMessage(err),
      });
    }
  };

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

      {!client.isConnected && (
        <div className="flex gap-2">
          {client.isReconnecting ? (
            <Button variant="outline" onClick={handleStopReconnect}>
              Stop Reconnecting
            </Button>
          ) : (
            <Button variant="outline" onClick={handleTriggerReconnect}>
              Trigger Reconnect
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
