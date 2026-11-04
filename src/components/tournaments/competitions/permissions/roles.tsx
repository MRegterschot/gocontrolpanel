"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useServerAction } from "@/hooks/tournaments/use-server-action";
import { hasPermission, PERMISSION } from "@/lib/competition-permissions";
import { reducers } from "@/lib/server-manager";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useReducer } from "spacetimedb/react";
import PermissionEditor from "./permission-editor";
import { useCompetitionAccess } from "./use-competition-access";

export default function Roles({ competitionId }: { competitionId: number }) {
  const { roles, roleMembers, mine } = useCompetitionAccess(competitionId);
  const [name, setName] = useState("");

  const create = useServerAction(useReducer(reducers.roleCreate), "Failed to create role", "Role created");
  const remove = useServerAction(useReducer(reducers.roleRemove), "Failed to remove role", "Role removed");
  const edit = useServerAction(useReducer(reducers.roleAssignPermission), "Failed to update permissions", "Permissions updated");
  const can = (permission: bigint) => hasPermission(mine, permission);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">Roles</h3>
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await create({ competitionId, name })) setName("");
          }}
        >
          <Input className="h-8" placeholder="Role name" value={name} onChange={(e) => setName(e.target.value)} disabled={!can(PERMISSION.ROLE_CREATE)} />
          <Button size="sm" type="submit" disabled={!name || !can(PERMISSION.ROLE_CREATE)}>
            <IconPlus />
            Create
          </Button>
        </form>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead>Members</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((role) => (
            <TableRow key={role.id}>
              <TableCell className="font-medium">{role.name}</TableCell>
              <TableCell>
                <PermissionEditor
                  title={`Permissions of ${role.name}`}
                  value={role.permissions}
                  mine={mine}
                  canEdit={can(PERMISSION.ROLE_EDIT)}
                  onSave={(newPermissions) => edit({ roleId: role.id, newPermissions })}
                />
              </TableCell>
              <TableCell>{roleMembers.filter((rm) => rm.roleId === role.id).length}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" disabled={!can(PERMISSION.ROLE_REMOVE)} onClick={() => remove({ roleId: role.id })}>
                  <IconTrash />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
