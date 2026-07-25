import { getJoinLink } from "@/actions/gbx/advanced";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdvancedActionsForm from "@/forms/server/advanced/advanced-actions-form";
import ScriptGeneratorForm from "@/forms/server/advanced/script-generator-form";
import { hasPermission } from "@/lib/auth";
import { routePermissions, routes } from "@/routes";
import { redirect } from "next/navigation";

export default async function ServerAdvancedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const canView = await hasPermission(routePermissions.servers.advanced, id);

  if (!canView) {
    redirect(routes.dashboard);
  }

  const { data: joinLink } = await getJoinLink(id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Advanced Actions</h1>
        <h4 className="text-muted-foreground">
          Perform advanced actions, such as managing fake players, and
          retrieving the server&apos;s join link.
        </h4>
      </div>

      <Tabs defaultValue="advanced-actions" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="advanced-actions">Advanced Actions</TabsTrigger>
          <TabsTrigger value="script-generator">Script Generator</TabsTrigger>
        </TabsList>

        <TabsContent value="advanced-actions" className="flex flex-col gap-6">
          <Card className="p-6">
            <AdvancedActionsForm serverId={id} joinLink={joinLink} />
          </Card>
        </TabsContent>

        <TabsContent value="script-generator" className="flex flex-col gap-6">
          <Card className="p-6">
            <ScriptGeneratorForm serverId={id} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
