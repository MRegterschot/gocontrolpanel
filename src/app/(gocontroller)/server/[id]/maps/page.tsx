import { getMapList } from "@/actions/database/maps";
import { getJukebox } from "@/actions/gbx/map";
import { getLocalMaps } from "@/actions/gbx/server";
import Jukebox from "@/components/maps/jukebox";
import ServerMaps from "@/components/maps/server-maps";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { hasPermission } from "@/lib/auth";
import { getLogger } from "@/lib/logger";
import { getFileManagerHealth } from "@/lib/managers/file-manager";
import { routePermissions, routes } from "@/routes";
import { LocalMapInfo } from "@/types/map";
import { redirect } from "next/navigation";

export default async function ServerMapsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const log = getLogger(id);

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
    log.error({ err }, "Failed to fetch file manager");
  }

  let localMaps: LocalMapInfo[] = [];
  if (fmHealth) {
    try {
      const { data } = await getLocalMaps(id);
      localMaps = data;
    } catch (err) {
      log.error({ err }, "Failed to fetch local maps");
    }
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
          <ServerMaps
            serverId={id}
            maps={maps}
            fmHealth={fmHealth}
            localMaps={localMaps}
          />
        </TabsContent>
        <TabsContent value="jukebox" className="flex flex-col gap-6">
          <p className="text-sm text-muted-foreground">
            Note: If you have a seperate server controller running on this
            server, the jukeboxes might conflict.
          </p>

          <Jukebox serverId={id} jukebox={jukebox} maps={maps} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
