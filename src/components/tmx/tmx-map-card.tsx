import { addMapToServer, downloadMap } from "@/actions/tmx/maps";
import { cn, getErrorMessage } from "@/lib/utils";
import { TMXMap } from "@/types/api/tmx";
import { ServerError } from "@/types/responses";
import {
  IconDownload,
  IconMapPlus,
  IconPhoto,
  IconTrophyFilled,
  IconUser,
} from "@tabler/icons-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { parseTmTags } from "tmtags";
import MapMedals from "../maps/map-medals";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Separator } from "../ui/separator";

export default function TMXMapCard({
  serverId,
  fmHealth,
  map,
  className,
}: {
  serverId: string;
  fmHealth: boolean;
  map: TMXMap;
  className?: string;
}) {
  const [isDownloading, setIsDownloading] = useState(false);

  const imagePosition = map.Images.reduce(
    (max, img) => Math.max(max, img.Position),
    -1,
  );

  const onDownload = async () => {
    try {
      if (!fmHealth) {
        toast.error("File manager is not healthy, cannot download map");
        return;
      }

      if (isDownloading) return;

      setIsDownloading(true);

      const { error } = await downloadMap(serverId, map.MapId);
      if (error) {
        throw new ServerError(error, "DownloadMapError");
      }

      toast.success("Map successfully downloaded", {
        description: "You can find it in the Maps/Downloaded folder",
      });
    } catch (err) {
      toast.error("Failed to download map", {
        description: getErrorMessage(err),
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const onAdd = async () => {
    try {
      if (!fmHealth) {
        toast.error("File manager is not healthy, cannot add map");
        return;
      }

      if (isDownloading) return;

      setIsDownloading(true);

      const { error } = await addMapToServer(serverId, map.MapId);
      if (error) {
        throw new ServerError(error, "AddMapToServerError");
      }

      toast.success("Map successfully added to server");
    } catch (err) {
      toast.error("Failed to add map to server", {
        description: getErrorMessage(err),
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card className={cn("flex flex-col flex-1 relative", className)}>
      <div className="relative">
        {map.HasThumbnail || imagePosition > 0 ? (
          <Image
            src={`https://trackmania.exchange/mapimage/${map.MapId}${imagePosition > -1 ? `/${imagePosition}` : ""}`}
            fill
            alt={map.Name}
            className="static! rounded-t-lg h-40! object-cover"
          />
        ) : (
          <div className="w-full h-40 rounded-t-lg flex items-center justify-center">
            <IconPhoto className="text-gray-500" size={48} />
          </div>
        )}
        <div
          className={cn(
            "flex items-center space-x-2 justify-between absolute bottom-0 left-0 right-0 bg-white/20 p-2 backdrop-blur-sm dark:bg-black/40 text-white",
            !map.HasThumbnail &&
              imagePosition <= 0 &&
              "bg-gradient-to-t from-black/60 via-black/40 to-transparent",
          )}
        >
          <h3
            className="truncate text-lg font-semibold text-white"
            dangerouslySetInnerHTML={{
              __html: parseTmTags(map.GbxMapName ?? ""),
            }}
          ></h3>

          <div className="flex items-center gap-2">
            <IconUser className="!size-5 flex-shrink-0" />
            <span
              className="text-sm truncate"
              dangerouslySetInnerHTML={{
                __html: parseTmTags(map.Authors[0]?.User.Name ?? ""),
              }}
            ></span>
          </div>
        </div>
      </div>

      <div className="flex flex-col p-2 gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex gap-2 justify-between">
            <div className="flex gap-1 overflow-x-hidden">
              {map.Tags.map((tag, index) => (
                <Badge key={index} variant={"outline"}>
                  {tag.Name}
                </Badge>
              ))}
            </div>

            <div className="flex gap-2 items-center">
              <span>{map.AwardCount}</span>
              <IconTrophyFilled className="text-yellow-400" size={18} />
            </div>
          </div>
        </div>

        <MapMedals
          medals={{
            authorTime: map.Medals.Author,
            goldTime: map.Medals.Gold,
            silverTime: map.Medals.Silver,
            bronzeTime: map.Medals.Bronze,
          }}
        />

        {fmHealth && (
          <>
            <Separator />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onDownload}
                disabled={isDownloading}
              >
                <IconDownload />
                Download
              </Button>
              <Button
                variant="outline"
                onClick={onAdd}
                disabled={isDownloading}
              >
                <IconMapPlus />
                Add to Server
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
