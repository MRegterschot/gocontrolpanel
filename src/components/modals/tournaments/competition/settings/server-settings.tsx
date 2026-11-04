"use client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useServerAction } from "@/hooks/tournaments/use-server-action";
import { isSameNode } from "@/lib/node-handle";
import { reducers, tables } from "@/lib/server-manager";
import { NodeHandle, ServerV1 } from "@/lib/server-manager/types";
import { IconX } from "@tabler/icons-react";
import { useReducer, useTable } from "spacetimedb/react";
import SharedConfigs from "./shared-configs";

export default function ServerSettings({ server }: { server: ServerV1 }) {
  const [occupied] = useTable(tables.competitionOccupiedServers({ competitionId: server.parentId }));
  const [available] = useTable(tables.competitionAvailableServerPool({ competitionId: server.parentId }));

  const assign = useServerAction(useReducer(reducers.serverAssignRawServer), "Failed to assign server", "Server assigned");
  const remove = useServerAction(useReducer(reducers.serverRemoveRawServer), "Failed to remove server", "Server removed");
  const override = useServerAction(useReducer(reducers.serverConfigOverride), "Failed to set config", "Config set");
  const configured = useServerAction(useReducer(reducers.serverConfigured), "Failed to start server", "Server started");
  const configuring = useServerAction(useReducer(reducers.serverConfiguring), "Failed to stop server", "Server back in configuring");

  const rawServer = occupied.find((s) => isSameNode(s.occupiedBy, NodeHandle.ServerV1(server.id)));
  const configuringNow = server.status.tag === "Configuring";

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">Status: <span className="font-semibold">{server.status.tag}</span></p>

      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Server</Label>
        {rawServer ? (
          <div className="flex items-center gap-2">
            <span className="flex-1 text-sm font-medium">{rawServer.serverLogin}</span>
            <Button variant="ghost" size="icon" onClick={() => remove({ serverId: server.id })}><IconX /></Button>
          </div>
        ) : (
          <Select value="" onValueChange={(v) => assign({ serverId: server.id, rawServerId: Number(v) })}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select a free server" /></SelectTrigger>
            <SelectContent className="z-[9999]">
              {available.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.serverLogin}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Servers have no shared config of their own, the chosen one is copied onto the server. */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Config {server.config ? "" : "(none yet)"}</Label>
        <SharedConfigs competitionId={server.parentId}>
          {(configs) => (
            <Select
              value=""
              onValueChange={(v) => {
                const config = configs.find((c) => c.id === Number(v));
                if (config) override({ to: server.id, config: config.config });
              }}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Copy a shared config" /></SelectTrigger>
              <SelectContent className="z-[9999]">
                {configs.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.name || `Config ${c.id}`} · {c.competitionName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </SharedConfigs>
      </div>

      <Button
        variant="outline"
        className="self-start"
        onClick={() => (configuringNow ? configured : configuring)({ id: server.id })}
      >
        {configuringNow ? "Start Server" : "Back to Configuring"}
      </Button>
    </div>
  );
}
