import ServerCodriver from "@/components/codriver/server-codriver";
import { hasPermission } from "@/lib/auth";
import { routePermissions, routes } from "@/routes";
import { redirect } from "next/navigation";

export default async function ServerCodriverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const canView = await hasPermission(routePermissions.servers.codriver, id);

  if (!canView) {
    redirect(routes.dashboard);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Codriver</h1>
        <h4 className="text-muted-foreground">
          The AI assistant players ask with /co or /ai in game chat.
        </h4>
      </div>
      <ServerCodriver serverId={id} />
    </div>
  );
}
