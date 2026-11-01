"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useServerAction } from "@/hooks/tournaments/use-server-action";
import { reducers, tables } from "@/lib/server-manager";
import { IconX } from "@tabler/icons-react";
import { useReducer, useTable } from "spacetimedb/react";

interface CompetitionServerPoolProps {
  id: number;
}

export default function CompetitionServerPool({
  id: competitionId,
}: CompetitionServerPoolProps) {
  const [[me]] = useTable(tables.myUser);
  const [servers, isReady] = useTable(tables.tabRawServer);
  const [lendings] = useTable(tables.tabCompetitionRawServer.where((r) => r.competitionId.eq(competitionId)));
  const [occupations] = useTable(tables.tabRawServerOccupation);
  // Includes the servers lent to the competitions above, but only free, verified and online ones.
  const [available] = useTable(tables.competitionAvailableServerPool({ competitionId }));
  const add = useServerAction(useReducer(reducers.rawServerAdd), "Failed to lend server", "Server lent");
  const remove = useServerAction(useReducer(reducers.rawServerRemove), "Failed to remove server", "Server removed");

  if (!isReady) return <p className="text-muted-foreground">Loading servers...</p>;

  const lent = servers.filter((s) => lendings.some((l) => l.serverId === s.id));
  const lendable = servers.filter((s) => s.userId === me?.id && s.verified && !lent.includes(s));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>Lend one of your servers</Label>
        <Select value="" onValueChange={(serverId) => add({ serverId: Number(serverId), competitionId })}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={lendable.length ? "Select a verified server" : "No verified servers to lend"} />
          </SelectTrigger>
          <SelectContent>
            {lendable.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.serverLogin}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Login</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Occupied</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {lent.map((server) => (
            <TableRow key={server.id}>
              <TableCell className="font-medium">{server.serverLogin}</TableCell>
              <TableCell>
                <Badge variant={server.online ? "default" : "secondary"}>{server.online ? "Online" : "Offline"}</Badge>
              </TableCell>
              <TableCell>{occupations.some((o) => o.serverId === server.id) ? "Yes" : "No"}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => remove({ serverId: server.id, competitionId })}>
                  <IconX />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <p className="text-sm text-muted-foreground">
        {available.length} server{available.length === 1 ? "" : "s"} free to use here, including ones lent to parent competitions.
      </p>
    </div>
  );
}
