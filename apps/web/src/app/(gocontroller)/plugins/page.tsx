import MarketplaceCatalog from "@/components/plugins/marketplace-catalog";
import UploadedPlugins from "@/components/plugins/uploaded-plugins";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { hasPermission } from "@/lib/auth";
import { routePermissions, routes } from "@/routes";
import { getInstallTargets, getMarketplace, getUploadedPlugins } from "@/services/plugins";
import { redirect } from "next/navigation";

export default async function PluginsPage() {
  if (!(await hasPermission(routePermissions.plugins.view))) redirect(routes.dashboard);
  const canUpload = await hasPermission(routePermissions.plugins.upload);

  const [{ data: marketplace }, { data: uploads }, { data: servers }] = await Promise.all([
    getMarketplace(),
    getUploadedPlugins(),
    getInstallTargets(),
  ]);
  const showUploads = canUpload || (uploads?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Plugins</h1>
        <h4 className="text-muted-foreground">
          Add widgets, chat commands and more to your servers. Plugins run in a sandbox and only
          get the permissions you accept.
        </h4>
      </div>

      <Tabs defaultValue="marketplace" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          {showUploads && <TabsTrigger value="uploads">Uploaded</TabsTrigger>}
        </TabsList>

        <TabsContent value="marketplace">
          {marketplace && <MarketplaceCatalog marketplace={marketplace} />}
        </TabsContent>

        {showUploads && (
          <TabsContent value="uploads">
            <UploadedPlugins uploads={uploads ?? []} servers={servers ?? []} canUpload={canUpload} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
