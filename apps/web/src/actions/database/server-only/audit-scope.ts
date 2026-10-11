import { Prisma } from "@gcp/db";
import { Session } from "next-auth";
import "server-only";

// Audit logs a non-global user may see or delete: only targets they administer. Member and
// Moderator roles, including public groups, give no audit access.
export function adminAuditScope(
  session: Session,
): Prisma.AuditLogsWhereInput | null {
  const { user } = session;
  const serverIds = [
    ...user.servers.filter((s) => s.role === "Admin").map((s) => s.id),
    ...user.groups
      .filter((g) => g.role === "Admin")
      .flatMap((g) => g.servers.map((s) => s.id)),
  ];
  const groupIds = user.groups
    .filter((g) => g.role === "Admin")
    .map((g) => g.id);
  const projectIds = user.projects
    .filter((p) => p.role === "Admin")
    .map((p) => p.id);

  const or: Prisma.AuditLogsWhereInput[] = [];
  if (serverIds.length > 0) {
    or.push({
      targetType: "server",
      targetId: { in: [...new Set(serverIds)] },
    });
  }
  if (groupIds.length > 0) {
    or.push({ targetType: "group", targetId: { in: groupIds } });
  }
  if (projectIds.length > 0) {
    or.push({ targetType: "hetzner", targetId: { in: projectIds } });
  }
  return or.length > 0 ? { OR: or } : null;
}
