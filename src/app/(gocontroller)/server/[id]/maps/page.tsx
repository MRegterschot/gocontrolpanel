import { getMapList } from "@/actions/database/maps";
import { getJukebox } from "@/actions/gbx/map";
import Jukebox from "@/components/maps/jukebox";
import LocalMapsTable from "@/components/maps/local-maps-table";
import MapOrder from "@/components/maps/map-order";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { hasPermission } from "@/lib/auth";
import { getFileManagerHealth } from "@/lib/managers/file-manager";
import { routePermissions, routes } from "@/routes";
import { redirect } from "next/navigation";

export default async function ServerMapsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const canView = await hasPermission(routePermissions.servers.maps, id);
  if (!canView) {
    redirect(routes.dashboard);
  }

  const { data: maps } = await getMapList(id);
  const { data: jukebox } = await getJukebox(id);

  let fmHealth = false;
  try {
    fmHealth = await getFileManagerHealth(id);
  } catch (err) {
    console.error("Failed to fetch file manager:", err);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Manage Server Maps</h1>
        <h4 className="text-muted-foreground">
          Manage the maps of the server and their order.
        </h4>
      </div>
      <Tabs defaultValue="maps" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="maps">Server Maps</TabsTrigger>
          <TabsTrigger value="jukebox">Jukebox</TabsTrigger>
        </TabsList>
        <TabsContent value="maps" className="flex flex-col gap-6">
          <MapOrder mapList={maps} serverId={id} />

          {fmHealth && <LocalMapsTable serverId={id} />}
        </TabsContent>
        <TabsContent value="jukebox" className="flex flex-col gap-6">
          <p className="text-muted-foreground">
            Note: If you have a seperate server controller running on this
            server, the jukeboxes might conflict.
          </p>

          <Jukebox serverId={id} jukebox={jukebox} maps={maps} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
