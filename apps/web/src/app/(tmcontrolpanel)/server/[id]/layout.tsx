import { auth } from "@/lib/auth";
import { routes } from "@/routes";
import { redirect } from "next/navigation";

export default async function ServerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session) {
    redirect(routes.login);
  }

  const canView =
    session.user.admin ||
    session.user.servers.some((server) => server.id === id) ||
    session.user.groups.some((group) =>
      group.servers.some((server) => server.id === id),
    );

  if (!canView) {
    redirect(routes.dashboard);
  }

  return <div className="p-4 lg:p-6 h-full">{children}</div>;
}
