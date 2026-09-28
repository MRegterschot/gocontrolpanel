"use client";
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
    id: number;
}

export default function CompetitionSharedConfigs({
    id,
}: CompetitionSharedConfigsProps) {

    const proc = useProcedure(procedures.unstableCompetitionRawServerConfigV2);
    const configs = useSpacetimeProcedure(proc, { competitionId: id }).data

    if (configs === null) {
        return <div>Failed</div>
    }

    return (
        <div className="">
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

