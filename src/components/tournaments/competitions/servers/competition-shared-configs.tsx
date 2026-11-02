"use client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { tables } from "@/lib/server-manager";
import { IconPencil, IconPlus } from "@tabler/icons-react";
import { useTable } from "spacetimedb/react";
import SharedConfigDialog from "./shared-config-dialog";

interface CompetitionSharedConfigsProps {
  competitionId: number;
}

export default function CompetitionSharedConfigs({
  competitionId,
}: CompetitionSharedConfigsProps) {
  const [rows, isReady] = useTable(tables.competitionSharedConfigs({ competitionId }));
  const configs = rows.filter((c) => c.competitionId === competitionId);

  if (!isReady) return <p className="text-muted-foreground">Loading configs...</p>;

  return (
    <div className="flex flex-col gap-2">
      <SharedConfigDialog competitionId={competitionId}>
        <Button variant="outline" className="self-start">
          <IconPlus />
          Add Config
        </Button>
      </SharedConfigDialog>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead>Maps</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {configs.map((config) => (
            <TableRow key={config.id}>
              <TableCell className="font-medium">{config.name || `Config ${config.id}`}</TableCell>
              <TableCell>{config.config.mode.tag}</TableCell>
              <TableCell>{config.config.maps.mapUids.length}</TableCell>
              <TableCell className="text-right">
                <SharedConfigDialog competitionId={competitionId} config={config}>
                  <Button variant="ghost" size="icon"><IconPencil /></Button>
                </SharedConfigDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
