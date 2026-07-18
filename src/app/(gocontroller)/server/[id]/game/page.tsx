import { getMapList } from "@/actions/database/maps";
import { getMatchSettings, getScripts } from "@/actions/filemanager";
import {
  getModeScriptInfo,
  getModeScriptSettings,
  getScriptName,
  getShowOpponents,
} from "@/actions/gbx/game";
import { getCurrentMapIndex } from "@/actions/gbx/map";
import MapCarousel from "@/components/maps/map-carousel";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MatchSettingsForm from "@/forms/server/game/match-settings-form";
import ModeScriptSettingsForm from "@/forms/server/game/mode-script-settings-form";
import PlaylistForm from "@/forms/server/game/playlist-form";
import ScriptNameForm from "@/forms/server/game/script-name-form";
import ShowOpponentsForm from "@/forms/server/game/show-opponents-form";
import { hasPermission } from "@/lib/auth";
import { routePermissions } from "@/routes";
import { ModeScriptInfo } from "@/types/gbx";
import { parseTmTags } from "tmtags";

export default async function ServerGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const canGameSettings = await hasPermission(
    routePermissions.servers.game.gameSettings,
    id,
  );
  const canScriptSettings = await hasPermission(
    routePermissions.servers.game.scriptSettings,
    id,
  );

  const { data: mapList } = await getMapList(id);
  const { data: currentIndex } = await getCurrentMapIndex(id);

  let showOpponents = 0;
  let scriptName = "";
  let scripts: string[] = [];
  let matchSettings: string[] = [];

  if (canGameSettings) {
    const [showOpponentsRes, scriptNameRes, scriptsRes, matchSettingsRes] =
      await Promise.all([
        getShowOpponents(id),
        getScriptName(id),
        getScripts(id),
        getMatchSettings(id),
      ]);

    showOpponents = showOpponentsRes.data.NextValue || 0;
    scriptName = scriptNameRes.data.NextValue || "";
    scripts = scriptsRes.data || [];
    matchSettings = matchSettingsRes.data || [];
  }

  let modeScriptInfo: ModeScriptInfo = {
    Name: "",
    CompatibleTypes: "",
    Description: "",
    Version: "",
    ParamDescs: [],
    CommandDescs: [],
  };

  let modeScriptSettings: {
    [key: string]: string | number | boolean;
  } = {};

  if (canScriptSettings) {
    const [modeScriptInfoRes, modeScriptSettingsRes] = await Promise.all([
      getModeScriptInfo(id),
      getModeScriptSettings(id),
    ]);

    console.log(modeScriptInfoRes.data, modeScriptSettingsRes.data);

    modeScriptInfo = modeScriptInfoRes.data;
    modeScriptSettings = modeScriptSettingsRes.data;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Manage Game</h1>
        <h4 className="text-muted-foreground">
          Manage general game settings, including map rotation, script settings
          and gamemodes.
        </h4>
      </div>

      <Tabs defaultValue="map" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="map">Map Rotation</TabsTrigger>
          {canScriptSettings && (
            <TabsTrigger value="script">Script Settings</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="map" className="flex flex-col gap-6">
          <MapCarousel
            serverId={id}
            maps={mapList}
            startIndex={currentIndex}
            loop={true}
            className="w-full"
          />

          {canGameSettings && (
            <Card className="p-6">
              <div className="flex gap-6 flex-col xl:flex-row">
                <div className="flex flex-col gap-4 flex-1">
                  <ShowOpponentsForm
                    serverId={id}
                    showOpponents={showOpponents}
                  />
                  <ScriptNameForm
                    serverId={id}
                    scriptName={scriptName}
                    scripts={scripts}
                  />
                </div>
                <div className="flex flex-col gap-4 flex-1">
                  <MatchSettingsForm
                    serverId={id}
                    matchSettings={matchSettings}
                  />
                  <PlaylistForm serverId={id} />
                </div>
              </div>
            </Card>
          )}
        </TabsContent>
        {canScriptSettings && (
          <TabsContent value="script">
            <Card className="p-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2 min-[960px]:w-1/2">
                  <div className="flex flex-col">
                    <h2 className="text-lg font-bold">Mode Script Settings </h2>
                    <p className="text-base text-muted-foreground font-medium truncate">
                      ({modeScriptInfo.Name})
                    </p>
                  </div>
                  <p
                    className="text-base"
                    dangerouslySetInnerHTML={{
                      __html: parseTmTags(modeScriptInfo.Description),
                    }}
                  />
                </div>

                <ModeScriptSettingsForm
                  serverId={id}
                  modeScriptSettings={modeScriptSettings}
                  modeScriptInfo={modeScriptInfo}
                />
              </div>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
