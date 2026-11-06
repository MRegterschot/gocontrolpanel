"use server";

import { doServerActionWithAuth } from "@/lib/actions";
import { parseInput, roleInput } from "@/lib/admin-inputs";
import { ServerResponse } from "@/types/responses";
import { Roles } from "@tmcontrolpanel/db";
import { withAudit } from "./server-only/audit-logs";

export async function createRole(
  role: Omit<Roles, "id" | "createdAt" | "updatedAt" | "deletedAt">,
): Promise<ServerResponse<Roles>> {
  return doServerActionWithAuth(["roles:create"], async (session) => {
    const input = parseInput(roleInput, role);
    const newRole = await withAudit(
      (tx) =>
        tx.roles.create({
          data: {
            name: input.name,
            description: input.description ?? null,
            permissions: [...new Set(input.permissions)],
          },
        }),
      (newRole) => [session.user.id, newRole.id, "role.create", input],
    );

    return newRole;
  });
}

export async function updateRole(
  roleId: string,
  role: Omit<Roles, "id" | "createdAt" | "updatedAt" | "deletedAt">,
): Promise<ServerResponse<Roles>> {
  return doServerActionWithAuth(["roles:edit"], async (session) => {
    const input = parseInput(roleInput, role);
    const updatedRole = await withAudit(
      (tx) =>
        tx.roles.update({
          where: { id: roleId, deletedAt: null },
          data: {
            name: input.name,
            description: input.description ?? null,
            permissions: [...new Set(input.permissions)],
          },
        }),
      () => [session.user.id, roleId, "role.edit", input],
    );

    return updatedRole;
  });
}

export async function deleteRole(roleId: string): Promise<ServerResponse> {
  return doServerActionWithAuth(["roles:delete"], async (session) => {
    await withAudit(
      (tx) =>
        tx.roles.update({
          where: { id: roleId },
          data: { deletedAt: new Date() },
        }),
      () => [session.user.id, roleId, "role.delete"],
    );
  });
}
