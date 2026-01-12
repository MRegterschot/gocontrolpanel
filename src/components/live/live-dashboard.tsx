"use client";
import { getPlayerList } from "@/actions/gbx/player";
import useWebSocket from "@/hooks/use-websocket";
import { getErrorMessage, hasPermissionSync } from "@/lib/utils";
import { routePermissions } from "@/routes";
import { LiveInfo } from "@/types/live";
import { PlayerInfo } from "@/types/player";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "../ui/card";
import KnockoutScores from "./knockout-scores";
import LiveRound from "./live-round";
import MapInfo from "./mapinfo";
import MatchSettings from "./match-settings";
import Rankings from "./rankings";
import RoundScores from "./round-scores";
import TeamScores from "./team-scores";
import TimeAttackScores from "./time-attack-scores";

export default function LiveDashboard({ serverId }: { serverId: string }) {
  const { data: session } = useSession();

  const [playerList, setPlayerList] = useState<PlayerInfo[]>([]);
  const [liveInfo, setLiveInfo] = useState<LiveInfo | null>(null);
  const [mapInfo, setMapInfo] = useState<{
    map: string;
    mode: string;
  } | null>(null);

  const canActions = hasPermissionSync(
    session,
    routePermissions.servers.live.actions,
    serverId,
  );

  const handleMessage = useCallback((type: string, data: any) => {
    switch (type) {
      case "beginMatch": {
        setLiveInfo(data.info);
        setMapInfo({
          map: data.info.currentMap,
          mode: data.info.mode,
        });
        break;
      }
      case "finish": {
        setLiveInfo((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            activeRound: data.round,
          };
        });
        break;
      }
      case "personalBest": {
        setLiveInfo(data.info);
        break;
      }
      case "checkpoint": {
        setLiveInfo((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            activeRound: data.round,
          };
        });
        break;
      }
      case "beginRound": {
        setLiveInfo((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            activeRound: data.round,
          };
        });
        break;
      }
      case "endRound": {
        setLiveInfo(data.info);
        break;
      }
      case "beginMap": {
        setMapInfo((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            map: data.mapUid,
          };
        });
        break;
      }
      case "endMap": {
        setMapInfo((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            map: data.mapUid,
          };
        });
        break;
      }
      case "giveUp": {
        setLiveInfo((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            activeRound: data.round,
          };
        });
        break;
      }
      case "warmUpStart": {
        setLiveInfo(data.info);
        break;
      }
      case "warmUpEnd": {
        setLiveInfo(data.info);
        break;
      }
      case "warmUpStartRound": {
        setLiveInfo(data.info);
        break;
      }
      case "playerInfoChanged": {
        setLiveInfo((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            activeRound: data.round,
          };
        });
        break;
      }
      case "playerConnect": {
        setLiveInfo(data.live);
        break;
      }
      case "playerDisconnect": {
        setLiveInfo((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            activeRound: data.round,
          };
        });
        break;
      }
      case "updatedSettings": {
        setLiveInfo(data.info);
        break;
      }
      case "elimination": {
        setLiveInfo(data.info);
        break;
      }
      case "playerUpdated": {
        setLiveInfo((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            players: {
              ...prev.players,
              [data.round.login]: data.round,
            },
          };
        });
        break;
      }
    }
  }, []);

  useWebSocket({
    url: `/api/ws/live/${serverId}`,
    onMessage: handleMessage,
  });

  useEffect(() => {
    if (!liveInfo?.players) {
      return;
    }

    const fetchData = async () => {
      try {
        const { data, error } = await getPlayerList(serverId);
        if (error) {
          throw new Error(error);
        }

        setPlayerList(data);
      } catch (error) {
        toast.error("Error fetching player list", {
          description: getErrorMessage(error),
        });
      }
    };

    fetchData();
  }, [liveInfo?.players]);

  if (!liveInfo) {
    return <div className="text-sm">Loading...</div>;
  }

  return (
    <div className="grid w-full gap-4 grid-cols-1 min-[1200px]:grid-cols-2 min-[1528px]:grid-cols-[auto_1fr_auto]">
      <LiveRound
        activeRound={liveInfo.activeRound}
        playerList={playerList}
        isWarmUp={liveInfo.isWarmUp}
        warmUpRound={liveInfo.warmUpRound}
        warmUpTotalRounds={liveInfo.warmUpTotalRounds}
        isPaused={liveInfo.isPaused}
      />

      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-2 p-4 flex-1">
          {!["timeattack"].includes(liveInfo.type) && (
            <MatchSettings
              pointsLimit={liveInfo.pointsLimit}
              roundsLimit={liveInfo.roundsLimit}
              mapLimit={liveInfo.mapLimit}
              nbWinners={liveInfo.nbWinners}
            />
          )}

          {["teams", "tmwt", "tmwc"].includes(liveInfo.type) && (
            <TeamScores liveInfo={liveInfo} />
          )}
          {["rounds", "cup", "reversecup"].includes(liveInfo.type) && (
            <RoundScores liveInfo={liveInfo} />
          )}
          {["timeattack"].includes(liveInfo.type) && (
            <TimeAttackScores liveInfo={liveInfo} />
          )}
          {["knockout"].includes(liveInfo.type) && (
            <KnockoutScores liveInfo={liveInfo} />
          )}
        </Card>
      </div>

      <div className="flex flex-col min-[1200px]:flex-row min-[1528px]:flex-col gap-4">
        <MapInfo
          serverId={serverId}
          map={mapInfo?.map}
          mode={mapInfo?.mode}
          pauseAvailable={liveInfo.pauseAvailable}
          isPaused={liveInfo.isPaused}
          isWarmUp={liveInfo.isWarmUp}
          canActions={canActions}
        />
        <Rankings
          serverId={serverId}
          players={liveInfo.players}
          teams={liveInfo.teams}
          type={liveInfo.type}
          canActions={canActions}
        />
      </div>
    </div>
  );
}
