"use client";
import {
  addCampaignToServer,
  downloadCampaign,
} from "@/actions/nadeo/campaigns";
import { getErrorMessage } from "@/lib/utils";
import { ClubCampaignWithNamesAndPlaylistMaps } from "@/types/api/nadeo";
import { IconDownload, IconMapPlus, IconPhoto } from "@tabler/icons-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { parseTmTags } from "tmtags";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Separator } from "../ui/separator";
import PlaylistMapCard from "./playlist-map-card";
import { ServerError } from "@/types/responses";

export default function ClubCampaignMaps({
  serverId,
  fmHealth,
  clubCampaign,
}: {
  serverId: string;
  fmHealth: boolean;
  clubCampaign?: ClubCampaignWithNamesAndPlaylistMaps;
}) {
  const [isDownloading, setIsDownloading] = useState(false);

  const onDownloadCampaign = async () => {
    try {
      if (!fmHealth) {
        toast.error("File manager is not healthy, cannot download campaign");
        return;
      }

      if (!clubCampaign) {
        toast.error("Campaign not found");
        return;
      }

      if (clubCampaign.campaign.playlist.length === 0) {
        toast.error("Campaign has no maps to download");
        return;
      }

      if (isDownloading) return;

      setIsDownloading(true);
      toast.info("Downloading campaign...");

      const { error } = await downloadCampaign(serverId, clubCampaign.campaign);
      if (error) {
        throw new ServerError(error, "DownloadCampaignError");
      }

      toast.success("Campaign successfully downloaded", {
        description: `You can find the maps in the Maps/Downloaded/${clubCampaign.campaign.name} folder`,
      });
    } catch (err) {
      toast.error("Failed to download campaign", {
        description: getErrorMessage(err),
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const onAddCampaignToServer = async () => {
    try {
      if (!fmHealth) {
        toast.error("File manager is not healthy, cannot add campaign");
        return;
      }

      if (!clubCampaign) {
        toast.error("Campaign not found");
        return;
      }

      if (clubCampaign.campaign.playlist.length === 0) {
        toast.error("Campaign has no maps to add");
        return;
      }

      if (isDownloading) return;

      setIsDownloading(true);
      toast.info("Adding campaign to server...");

      const { error } = await addCampaignToServer(
        serverId,
        clubCampaign.campaign,
      );
      if (error) {
        throw new ServerError(error, "AddCampaignToServerError");
      }

      toast.success("Campaign successfully added to server");
    } catch (err) {
      toast.error("Failed to add campaign to server", {
        description: getErrorMessage(err),
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (!clubCampaign) {
    return <span>Campaign not found</span>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4 flex flex-col gap-4">
        <div className="flex gap-4 flex-col lg:flex-row lg:min-w-128">
          {clubCampaign.mediaUrl ? (
            <Image
              src={clubCampaign.mediaUrl}
              fill
              alt={clubCampaign.name}
              className="static! rounded-lg max-w-92 object-cover"
            />
          ) : (
            <div className="w-full rounded-lg flex items-center justify-center max-w-92">
              <IconPhoto className="text-gray-500" size={48} />
            </div>
          )}
          <div className="flex flex-col gap-4 lg:min-w-92">
            <div className="flex flex-col gap-2">
              <h2
                className="text-xl font-bold truncate"
                dangerouslySetInnerHTML={{
                  __html: parseTmTags(clubCampaign.name),
                }}
              ></h2>
            </div>

            <div className="grid grid-cols-2 gap-2 max-w-128">
              <div className="flex flex-col">
                <span className="font-semibold">Creator</span>
                <span className="truncate">{clubCampaign.creatorName}</span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">Latest Editor</span>
                <span className="truncate">
                  {clubCampaign.latestEditorName}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">Created At</span>
                <span className="truncate">
                  {new Date(
                    clubCampaign.creationTimestamp * 1000,
                  ).toLocaleDateString()}{" "}
                  {new Date(
                    clubCampaign.creationTimestamp * 1000,
                  ).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">Maps</span>
                <span className="truncate">{clubCampaign.mapsCount}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex gap-2 justify-between sm:items-end flex-col sm:flex-row">
            <h3 className="text-md font-bold">Maps</h3>

            {fmHealth && clubCampaign && (
              <div className="flex gap-2">
                <Button
                  variant={"outline"}
                  onClick={onDownloadCampaign}
                  disabled={isDownloading}
                >
                  <IconDownload />
                  Download
                </Button>
                <Button
                  variant={"outline"}
                  onClick={onAddCampaignToServer}
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

        {clubCampaign.campaign.playlist.length === 0 && (
          <span>No maps in this room</span>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {clubCampaign.campaign.playlist?.map((playlist, i) => (
            <PlaylistMapCard
              key={i}
              serverId={serverId}
              fmHealth={fmHealth}
              playlist={playlist}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
