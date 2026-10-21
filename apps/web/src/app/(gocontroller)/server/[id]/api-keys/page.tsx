import { ServerApiKeys } from "@/components/api-keys/api-keys-panel";
import { hasPermission } from "@/lib/auth";
import { routePermissions, routes } from "@/routes";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ServerApiKeysPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const canView = await hasPermission(routePermissions.servers.apiKeys, id);
  if (!canView) {
    redirect(routes.dashboard);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">API Keys</h1>
        <h4 className="text-muted-foreground">
          Keys let other tools use this server through the{" "}
          <Link href="/api/v1/openapi.json" className="underline">
            public API
          </Link>
          . A key stops working when its creator is no longer an admin here.
        </h4>
      </div>
      <ServerApiKeys serverId={id} />
    </div>
  );
}
