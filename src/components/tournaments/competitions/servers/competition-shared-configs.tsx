"use client";
import Modal from "@/components/modals/modal";
import CreateMatchTemplateModal from "@/components/modals/tournaments/match/create-match-template";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { tables } from "@/lib/server-manager";
import { IconPencil, IconPlus } from "@tabler/icons-react";
import { useTable } from "spacetimedb/react";

interface CompetitionSharedConfigsProps {
  competitionId: number;
}

export default function CompetitionSharedConfigs({
  competitionId,
}: CompetitionSharedConfigsProps) {
  const [configs, isReady] = useTable(tables.competitionSharedConfigs({ competitionId }));

  if (!isReady) return <p className="text-muted-foreground">Loading configs...</p>;

  return (
    <div className="flex flex-col gap-2">
      <Modal>
        <CreateMatchTemplateModal data={{ competitionId }} />
        <Button variant="outline" className="self-start">
          <IconPlus />
          Add Config
        </Button>
      </Modal>
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
                <Modal>
                  <CreateMatchTemplateModal data={{ competitionId, config }} />
                  <Button variant="ghost" size="icon"><IconPencil /></Button>
                </Modal>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
