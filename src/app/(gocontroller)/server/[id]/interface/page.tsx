import { getPlugins } from "@/actions/database/plugins";
import { getServerPlugins } from "@/actions/database/server-plugins";
import { getServerChatConfig } from "@/actions/database/servers";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChatConfigForm from "@/forms/server/interface/chatconfig-form";
import PluginsForm from "@/forms/server/interface/plugins-form";
import { hasPermission } from "@/lib/auth";
import { routePermissions, routes } from "@/routes";
import { redirect } from "next/navigation";

export default async function ServerInterfacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const canView = await hasPermission(routePermissions.servers.interface, id);

  if (!canView) {
    redirect(routes.dashboard);
  }

  const { data } = await getServerChatConfig(id);

  const { data: serverPlugins } = await getServerPlugins(id);
  const { data: plugins } = await getPlugins();

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Manage Interface</h1>
        <h4 className="text-muted-foreground">
          Manage the interface settings.
        </h4>
      </div>

      <Tabs defaultValue="plugins" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="plugins">Plugins</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
        </TabsList>

        <TabsContent value="plugins" className="flex flex-col gap-6">
          <Card className="p-6">
            <PluginsForm
              serverId={id}
              plugins={plugins}
              serverPlugins={serverPlugins}
            />
          </Card>
        </TabsContent>
        <TabsContent value="chat" className="flex flex-col gap-6">
          <Card className="p-6">
            <ChatConfigForm serverId={id} chatConfig={data} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
