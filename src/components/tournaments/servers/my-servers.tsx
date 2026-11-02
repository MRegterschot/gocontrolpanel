"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useServerAction } from "@/hooks/tournaments/use-server-action";
import { reducers, tables } from "@/lib/server-manager";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useReducer, useTable } from "spacetimedb/react";

// A lending of a server to a competition, the stages below it can use the server as well.
// The client cache merges the rows of a view for all args, so the competition is looked up by id.
function Lending({ serverId, competitionId }: { serverId: number; competitionId: number }) {
  const [competitions] = useTable(tables.competition({ competitionId }));
  const competition = competitions.find((c) => c.id === competitionId);
  const remove = useServerAction(useReducer(reducers.rawServerRemove), "Failed to remove server", "Server removed");

  return (
    <Badge variant="outline" className="gap-1">
      {competition?.name ?? `Competition ${competitionId}`}
      <IconX className="size-3 cursor-pointer" onClick={() => remove({ serverId, competitionId })} />
    </Badge>
  );
}

export default function MyServers() {
  const [myServers, isReady] = useTable(tables.myRawServers);
  const [lendings] = useTable(tables.myRawServerLendings);
  const verify = useServerAction(useReducer(reducers.rawServerVerify), "Failed to verify server", "Server verified");

  if (!isReady) return <p className="text-muted-foreground">Loading servers...</p>;
  if (myServers.length === 0) {
    return <p className="text-muted-foreground">No servers yet. A server shows up here once its bridge logs in with your account.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Login</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Last connection</TableHead>
          <TableHead>Verified</TableHead>
          <TableHead>Lent to</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {myServers.map((server) => (
          <TableRow key={server.id}>
            <TableCell className="font-medium">{server.serverLogin}</TableCell>
            <TableCell>
              <Badge variant={server.online ? "default" : "secondary"}>{server.online ? "Online" : "Offline"}</Badge>
            </TableCell>
            <TableCell>{server.lastConnection.toDate().toLocaleString()}</TableCell>
            <TableCell>
              {server.verified ? (
                <IconCheck className="size-4 text-green-500" />
              ) : (
                <Button size="sm" variant="outline" onClick={() => verify({ serverId: server.id })}>Verify</Button>
              )}
            </TableCell>
            <TableCell className="flex flex-wrap gap-1">
              {lendings
                .filter((l) => l.serverId === server.id)
                .map((l) => <Lending key={l.competitionId} serverId={server.id} competitionId={l.competitionId} />)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
