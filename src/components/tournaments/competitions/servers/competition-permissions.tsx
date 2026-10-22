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
import Permissions from "../../permissions";


interface CompetitionPermissionsProps {
    id: number;
}

export default function CompetitionPermissions({
    id,
}: CompetitionPermissionsProps) {

    const [userPermissions, isUserReady] = useTable(tables.tabCompetitionMember)//.where((row) => row.competitionId.eq(id)))
    const [competitionRoles, isRolesReady] = useTable(tables.tabCompetitionRole.where((row) => row.competitionId.eq(id)))
    //const [competitionRoleMembers, isRoleMemberrsReady] = useTable(tables.tabCompetitionRoleMember.where((row) => row..eq(id))
    const [userTable, userReady] = useTable(tables.tabUser)

    if (!(isUserReady && isRolesReady && userReady)) {
        return <div>Loading...</div>
    }

    console.log(id)
    console.log(userPermissions)

    return (
        <div className="">
            User Permissions
            <Table>
                <TableHeader className="">
                    <TableRow>
                        <TableHead className="w-25 font-semibold">User</TableHead>
                        <TableHead className="font-semibold">Permissions</TableHead>
                        <TableHead className="font-semibold">Roles</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {userPermissions.map((user) => (
                        <TableRow key={user.id}>
                            <TableCell>{userTable.find((rawUser) => user.userId === rawUser.id)?.name}</TableCell>
                            <TableCell className="font-medium"><Permissions permissions={user.permissions} /></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            Role Permissions
            <Table>
                <TableHeader className="">
                    <TableRow>
                        <TableHead className="w-25 font-semibold">Name</TableHead>
                        <TableHead className="font-semibold">Permissions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {competitionRoles.map((role) => (
                        <TableRow key={role.id}>
                            <TableCell>{role.name}</TableCell>
                            <TableCell className="font-medium"><Permissions permissions={role.permissions} /></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

