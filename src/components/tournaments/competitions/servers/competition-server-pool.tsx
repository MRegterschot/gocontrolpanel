"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { tables } from "@/lib/server-manager";
import { useTable } from "spacetimedb/react";


interface CompetitionServerPoolProps {
    id: number;
}

export default function CompetitionServerPool({
    id,
}: CompetitionServerPoolProps) {

    //const [availableServersIds] = useTable(tables.tabCompetitionRawServer.where((ids) => ids.competitionId.eq(id)))
    const [availableServers, isReady] = useTable(tables.tabCompetitionRawServer.where((ids) => ids.competitionId.eq(id)).rightSemijoin(tables.tabRawServer, (l, r) => r.id.eq(l.serverId)))

    if (!isReady) {
        return <div>Loading...</div>
    }

    return (
        <div className="">
            <Table>
                <TableHeader className="">
                    <TableRow>
                        <TableHead className="w-25 font-semibold">Login</TableHead>
                        <TableHead className="font-semibold">Online</TableHead>
                        <TableHead className="font-semibold">Last Online</TableHead>
                        <TableHead className="font-semibold">Occupied</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {availableServers.map((server) => (
                        <TableRow key={server.id}>
                            <TableCell className="font-medium">{server.serverLogin}</TableCell>
                            <TableCell>
                                <Checkbox checked={server.online} disabled={true} />
                            </TableCell>
                            <TableCell>{server.lastConnection.toISOString()}</TableCell>
                            <TableCell>TODO</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

