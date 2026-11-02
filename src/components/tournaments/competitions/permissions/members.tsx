"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useServerAction } from "@/hooks/tournaments/use-server-action";
import { hasPermission, PERMISSION } from "@/lib/competition-permissions";
import { reducers } from "@/lib/server-manager";
import { useUsers } from "@/providers/users-provider";
import { IconTrash, IconX } from "@tabler/icons-react";
import { useReducer } from "spacetimedb/react";
import PermissionEditor from "./permission-editor";
import { useCompetitionAccess } from "./use-competition-access";
import UserPicker from "./user-picker";

export default function Members({ competitionId }: { competitionId: number }) {
  const { members, roles, roleMembers, mine } = useCompetitionAccess(competitionId);
  const users = useUsers();

  const add = useServerAction(useReducer(reducers.memberAdd), "Failed to add member", "Member added");
  const remove = useServerAction(useReducer(reducers.memberRemove), "Failed to remove member", "Member removed");
  const edit = useServerAction(useReducer(reducers.memberAssignPermission), "Failed to update permissions", "Permissions updated");
  const assign = useServerAction(useReducer(reducers.roleMemberAssign), "Failed to assign role", "Role assigned");
  const unassign = useServerAction(useReducer(reducers.roleMemberRemove), "Failed to unassign role", "Role unassigned");
  const can = (permission: bigint) => hasPermission(mine, permission);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Members</h3>
        <UserPicker
          exclude={members.map((m) => m.userId)}
          disabled={!can(PERMISSION.MEMBER_ADD)}
          onPick={(user) => add({ competitionId, accountId: user.accountId })}
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const user = users.get(member.userId);
            const memberRoles = roles.filter((r) => roleMembers.some((rm) => rm.roleId === r.id && rm.userId === member.userId));
            const otherRoles = roles.filter((r) => !memberRoles.includes(r));
            return (
              <TableRow key={member.id}>
                <TableCell className="font-medium">{user?.name ?? `User ${member.userId}`}</TableCell>
                <TableCell>
                  <PermissionEditor
                    title={`Permissions of ${user?.name ?? "member"}`}
                    value={member.permissions}
                    mine={mine}
                    canEdit={can(PERMISSION.MEMBER_EDIT)}
                    onSave={(newPermissions) => edit({ memberId: member.id, newPermissions })}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1">
                    {memberRoles.map((role) => (
                      <Badge key={role.id} variant="secondary" className="gap-1">
                        {role.name}
                        {can(PERMISSION.ROLE_UNASSIGN) && user && (
                          <IconX className="size-3 cursor-pointer" onClick={() => unassign({ roleId: role.id, accountId: user.accountId })} />
                        )}
                      </Badge>
                    ))}
                    {can(PERMISSION.ROLE_ASSIGN) && user && otherRoles.length > 0 && (
                      <Select value="" onValueChange={(v) => assign({ roleId: Number(v), accountId: user.accountId })}>
                        <SelectTrigger size="sm" className="h-6 w-auto text-xs"><SelectValue placeholder="Add role" /></SelectTrigger>
                        <SelectContent>
                          {otherRoles.map((r) => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" disabled={!can(PERMISSION.MEMBER_REMOVE)} onClick={() => remove({ memberId: member.id })}>
                    <IconTrash />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
