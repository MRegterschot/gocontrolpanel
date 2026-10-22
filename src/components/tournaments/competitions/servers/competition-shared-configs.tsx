"use client";
import Modal from "@/components/modals/modal";
import CreateMatchModal from "@/components/modals/tournaments/match/create-match";
import CreateMatchTemplateModal from "@/components/modals/tournaments/match/create-match-template";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSpacetimeProcedure } from "@/hooks/tournaments/use-spacetime-procedure";
import { procedures, tables } from "@/lib/server-manager";
import { useProcedure, useTable } from "spacetimedb/react";


interface CompetitionSharedConfigsProps {
    competitionId: number;
}

export default function CompetitionSharedConfigs({
    competitionId,
}: CompetitionSharedConfigsProps) {

    const proc = useProcedure(procedures.unstableCompetitionRawServerConfigV2);
    const configs = useSpacetimeProcedure(proc, { competitionId }).data

    if (configs === null) {
        return <div>Failed</div>
    }

    return (
        <div className="flex flex-col">
            <Modal>
                <CreateMatchTemplateModal data={competitionId} />
                <Button
                    variant="outline"
                    className="dark:bg-card hover:dark:bg-muted"
                >
                    Add Config
                </Button>
            </Modal>
            <Table>
                <TableHeader className="">
                    <TableRow>
                        <TableHead className="w-25 font-semibold">ID</TableHead>
                        <TableHead className="font-semibold">Format</TableHead>
                        <TableHead className="font-semibold">TODO MORE INFO</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {configs.map((config) => (
                        <TableRow key={config.id}>
                            <TableCell>{config.id}</TableCell>
                            <TableCell className="font-medium">{config.config.mode.tag}</TableCell>

                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

