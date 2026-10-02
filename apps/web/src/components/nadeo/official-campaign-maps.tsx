"use client";
import {
  addCampaignToServer,
  downloadCampaign,
} from "@/actions/nadeo/campaigns";
import { getErrorMessage } from "@/lib/utils";
import { CampaignWithNamesAndPlaylistMaps } from "@/types/api/nadeo";
import { IconArrowLeft, IconDownload, IconMapPlus } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import PlaylistMapCard from "./playlist-map-card";
import { ServerError } from "@/types/responses";

export default function OfficialCampaignMaps({
  serverId,
  fmHealth,
  campaign,
}: {
  serverId: string;
  fmHealth: boolean;
  campaign?: CampaignWithNamesAndPlaylistMaps | null;
}) {
  const router = useRouter();

  const [isDownloading, setIsDownloading] = useState(false);

  const onDownloadCampaign = async () => {
    try {
      if (!fmHealth) {
        toast.error("File manager is not healthy, cannot download campaign");
        return;
      }

      if (!campaign) {
        toast.error("Campaign not found");
        return;
      }

      if (campaign.playlist.length === 0) {
        toast.error("Campaign has no maps to download");
        return;
      }

      if (isDownloading) return;

      setIsDownloading(true);
      toast.info("Downloading campaign...");

      const { error } = await downloadCampaign(serverId, campaign);
      if (error) {
        throw new ServerError(error, "DownloadCampaignError");
      }

      toast.success("Campaign successfully downloaded", {
        description: `You can find the maps in the Maps/Downloaded/${campaign.name} folder`,
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

      if (!campaign) {
        toast.error("Campaign not found");
        return;
      }

      if (campaign.playlist.length === 0) {
        toast.error("Campaign has no maps to download");
        return;
      }

      if (isDownloading) return;

      setIsDownloading(true);
      toast.info("Adding campaign to server...");

      const { error } = await addCampaignToServer(serverId, campaign);
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 justify-between">
        <div className="flex gap-4 items-center">
          <Button variant="outline" collapse="sm" onClick={() => router.back()}>
            <IconArrowLeft />
            Back
          </Button>

          <h2 className="text-xl font-bold truncate">
            {campaign ? `${campaign.name}` : "Campaign not found"}
          </h2>
        </div>

        {fmHealth && campaign && (
          <div className="flex gap-2">
            <Button
              variant={"outline"}
              collapse="sm"
              onClick={onDownloadCampaign}
              disabled={isDownloading}
            >
              <IconDownload />
              Download
            </Button>
            <Button
              variant={"outline"}
              collapse="sm"
              onClick={onAddCampaignToServer}
              disabled={isDownloading}
            >
              <IconMapPlus />
              Add to Server
            </Button>
          </div>
        )}
      </div>

      {campaign && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-4">
          {campaign.playlist.map((pl) => (
            <PlaylistMapCard
              key={pl.mapUid}
              serverId={serverId}
              fmHealth={fmHealth}
              playlist={pl}
            />
          ))}
        </div>
      )}
    </div>
  );
}
