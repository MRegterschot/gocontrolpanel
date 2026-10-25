import CodriverChat from "@/components/codriver/codriver-chat";
import CodriverHistoryCard from "@/components/codriver/history-card";
import ServerCodriver from "@/components/codriver/server-codriver";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { hasPermission } from "@/lib/auth";
import { routePermissions, routes } from "@/routes";
import { serverAdminPermissions } from "@/services/codriver";
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

  const canAdmin = await hasPermission(serverAdminPermissions(id));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Codriver</h1>
        <h4 className="text-muted-foreground">
          Ask Codriver here or use /co and /ai in game chat.
        </h4>
      </div>
      <Tabs defaultValue="chat">
        <TabsList>
          <TabsTrigger value="chat" className="px-4">
            Chat
          </TabsTrigger>
          {canAdmin && (
            <>
              <TabsTrigger value="usage" className="px-4">
                Usage
              </TabsTrigger>
              <TabsTrigger value="history" className="px-4">
                History
              </TabsTrigger>
              <TabsTrigger value="settings" className="px-4">
                Settings
              </TabsTrigger>
            </>
          )}
        </TabsList>
        <TabsContent
          value="chat"
          forceMount
          className="data-[state=inactive]:hidden"
        >
          <CodriverChat key={id} serverId={id} />
        </TabsContent>
        {canAdmin && (
          <>
            <TabsContent value="usage">
              <ServerCodriver serverId={id} usage />
            </TabsContent>
            <TabsContent value="history">
              <CodriverHistoryCard serverId={id} />
            </TabsContent>
            <TabsContent value="settings">
              <ServerCodriver serverId={id} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
