import InstalledPlugins from "@/components/plugins/installed-plugins";
import { getPlugins } from "@/services/database/plugins";
import { getServerPlugins } from "@/services/database/server-plugins";
import { getServerChatConfig } from "@/services/database/servers";
import { getPluginScripts } from "@/services/filemanager";
import { getServerPlugin } from "@/services/gbx/server-plugin";
import {
  getInstalledPlugins,
  getServerPluginsContext,
  getUploadedPlugins,
} from "@/services/plugins";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChatConfigForm from "@/forms/server/plugins/chatconfig-form";
import PluginsForm from "@/forms/server/plugins/plugins-form";
import ServerPluginsForm from "@/forms/server/plugins/server-plugins-form";
import { hasPermission } from "@/lib/auth";
import { routePermissions, routes } from "@/routes";
import { redirect } from "next/navigation";

export default async function ServerPluginsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const canView = await hasPermission(routePermissions.servers.plugins, id);

  if (!canView) {
    redirect(routes.dashboard);
  }

  const { data } = await getServerChatConfig(id);

  const { data: serverPlugins } = await getServerPlugins(id);
  const { data: plugins } = await getPlugins();

  const { data: serverPlugin } = await getServerPlugin(id);
  const { data: scripts } = await getPluginScripts(id);

  const [{ data: installed }, { data: uploads }, { data: context }] = await Promise.all([
    getInstalledPlugins(id),
    getUploadedPlugins(),
    getServerPluginsContext(id),
  ]);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Manage Plugins</h1>
        <h4 className="text-muted-foreground">
          Manage the plugins of the server, and configure the chat settings.
        </h4>
      </div>

      <Tabs defaultValue="plugins" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="plugins">Plugins</TabsTrigger>
          <TabsTrigger value="server-plugins">Server Plugins</TabsTrigger>
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

          <Card className="p-6">
            <InstalledPlugins
              serverId={id}
              serverName={context?.serverName ?? "this server"}
              plugins={installed ?? []}
              uploads={uploads ?? []}
              marketplaceEnabled={context?.marketplaceEnabled ?? false}
            />
          </Card>
        </TabsContent>

        <TabsContent value="server-plugins" className="flex flex-col gap-6">
          <Card className="p-6">
            <ServerPluginsForm
              serverId={id}
              defaultServerPlugin={serverPlugin}
              scripts={scripts}
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
