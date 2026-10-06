"use client";

import { addRoomToServer, downloadRoom } from "@/actions/nadeo/clubs";
import { ModalContent } from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useQueryErrorToast } from "@/hooks/use-query-error-toast";
import { getClubRoomWithNamesAndMaps } from "@/lib/api-client/nadeo";
import { queryKeys, unwrap } from "@/lib/api-client/query";
import { getErrorMessage } from "@/lib/utils";
import { ClubActivity } from "@/types/api/nadeo";
import { ServerError } from "@/types/responses";
import {
  IconCheck,
  IconDownload,
  IconMapPlus,
  IconPhoto,
  IconX,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { parseTmTags } from "tmtags";
import { Card } from "../../ui/card";
import { DefaultModalProps } from "../default-props";
import ActivityMapCard from "./activity-map-card";

export default function RoomDetailsModal({
  data,
}: DefaultModalProps<{
  activity: ClubActivity;
  serverId: string;
  fmHealth: boolean;
}>) {
  const roomQuery = useQuery({
    queryKey: queryKeys.club(
      data?.activity.clubId ?? 0,
      "room",
      data?.activity.id ?? 0,
    ),
    queryFn: () =>
      unwrap(
        getClubRoomWithNamesAndMaps(data!.activity.clubId, data!.activity.id),
        "GetClubRoomError",
      ),
    enabled: !!data,
  });
  const clubRoom = roomQuery.data ?? null;
  const loading = roomQuery.isPending && !!data;
  const error = roomQuery.error ? getErrorMessage(roomQuery.error) : null;
  useQueryErrorToast(roomQuery.error, "Failed to fetch club room");

  const [isDownloading, setIsDownloading] = useState(false);

  const onDownloadRoom = async () => {
    try {
      if (!data?.fmHealth) {
        toast.error("File manager is not healthy, cannot download room");
        return;
      }

      if (!clubRoom) {
        toast.error("Room not found");
        return;
      }

      if (clubRoom.room.mapObjects.length === 0) {
        toast.error("Room has no maps to download");
        return;
      }

      if (isDownloading) return;

      setIsDownloading(true);
      toast.info("Downloading room...");

      const { error } = await downloadRoom(data.serverId, clubRoom.room);
      if (error) {
        throw new ServerError(error, "DownloadRoomError");
      }

      toast.success("Room successfully downloaded", {
        description: `You can find the maps in the Maps/Downloaded/${clubRoom.room.name} folder`,
      });
    } catch (err) {
      toast.error("Failed to download room", {
        description: getErrorMessage(err),
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const onAddRoomToServer = async () => {
    try {
      if (!data?.fmHealth) {
        toast.error("File manager is not healthy, cannot add room");
        return;
      }

      if (!clubRoom) {
        toast.error("Room not found");
        return;
      }

      if (clubRoom.room.mapObjects.length === 0) {
        toast.error("Room has no maps to add");
        return;
      }

      if (isDownloading) return;

      setIsDownloading(true);
      toast.info("Adding room to server...");

      const { error } = await addRoomToServer(data.serverId, clubRoom.room);
      if (error) {
        throw new ServerError(error, "AddRoomToServerError");
      }

      toast.success("Room successfully added to server");
    } catch (err) {
      toast.error("Failed to add room to server", {
        description: getErrorMessage(err),
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (!data) return null;

  return (
    <ModalContent className="max-w-[min(64rem,calc(100vw-2rem))]">
      <DialogHeader className="pr-6">
        <DialogTitle>Room Details</DialogTitle>
      </DialogHeader>

      {loading && <span>Loading...</span>}

      {error && <span>{error}</span>}

      {clubRoom && (
        <div className="flex flex-col gap-4">
          <Card className="p-4 flex flex-col gap-4">
            <div className="flex gap-4 flex-col lg:flex-row lg:min-w-128">
              {clubRoom.mediaUrl ? (
                <Image
                  src={clubRoom.mediaUrl}
                  fill
                  alt={clubRoom.name}
                  className="static! rounded-xl max-w-92 object-cover"
                />
              ) : (
                <div className="w-full rounded-xl flex items-center justify-center max-w-92">
                  <IconPhoto className="text-gray-500" size={48} />
                </div>
              )}
              <div className="flex flex-col gap-4 lg:min-w-92">
                <div className="flex flex-col gap-2">
                  <h2
                    className="text-xl font-bold truncate"
                    dangerouslySetInnerHTML={{
                      __html: parseTmTags(clubRoom.name),
                    }}
                  ></h2>
                </div>

                <div className="grid grid-cols-2 gap-2 max-w-128">
                  <div className="flex flex-col">
                    <span className="font-semibold">Creator</span>
                    <span className="truncate">{clubRoom.creatorName}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold">Latest Editor</span>
                    <span className="truncate">
                      {clubRoom.latestEditorName}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold">Created At</span>
                    <span className="truncate">
                      {new Date(
                        clubRoom.creationTimestamp * 1000,
                      ).toLocaleDateString()}{" "}
                      {new Date(
                        clubRoom.creationTimestamp * 1000,
                      ).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold">Server</span>
                    <span className="truncate">
                      {clubRoom.nadeo ? "Nadeo" : "Dedicated"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-2">
            <div className="flex flex-col">
              <h3 className="text-md font-bold">Room Details</h3>
              <Separator />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col">
                <span className="font-semibold">Max Players</span>
                <span className="truncate">{clubRoom.room.maxPlayers}</span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">Currently Playing</span>
                <span className="truncate">{clubRoom.room.playerCount}</span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">Scalable</span>
                <span className="truncate">
                  {clubRoom.room.scalable ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">Script</span>
                <span className="truncate">{clubRoom.room.script}</span>
              </div>
            </div>
          </div>

          {clubRoom.nadeo && (
            <>
              <div className="flex flex-col gap-2">
                <div className="flex flex-col">
                  <h3 className="text-md font-bold">Script Settings</h3>
                  <Separator />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {Object.values(clubRoom.room.scriptSettings).map(
                    (setting) => (
                      <div key={setting.key} className="flex flex-col gap-1">
                        <span className="font-semibold truncate">
                          {setting.key}
                        </span>
                        <span className="truncate max-w-64">
                          {setting.type === "boolean" ? (
                            setting.value === "true" ? (
                              <IconCheck />
                            ) : (
                              <IconX />
                            )
                          ) : (
                            setting.value
                          )}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <div className="flex gap-2 justify-between sm:items-end flex-col sm:flex-row">
                    <h3 className="text-md font-bold">Maps</h3>

                    {data.fmHealth && clubRoom && (
                      <div className="flex gap-2">
                        <Button
                          variant={"outline"}
                          onClick={onDownloadRoom}
                          disabled={isDownloading}
                        >
                          <IconDownload />
                          Download
                        </Button>
                        <Button
                          variant={"outline"}
                          onClick={onAddRoomToServer}
                          disabled={isDownloading}
                        >
                          <IconMapPlus />
                          Add to Server
                        </Button>
                      </div>
                    )}
                  </div>
                  <Separator />
                </div>

                {clubRoom.room.maps.length === 0 && (
                  <span>No maps in this room</span>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clubRoom.room.mapObjects?.map((map, i) => (
                    <ActivityMapCard key={i} map={map} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </ModalContent>
  );
}
