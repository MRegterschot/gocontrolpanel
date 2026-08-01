import { addMappackToServer, downloadMappack } from "@/actions/tmx/mappacks";
import { cn, getErrorMessage } from "@/lib/utils";
import { TMXMappack } from "@/types/api/tmx";
import {
  IconDownload,
  IconMap,
  IconMapPlus,
  IconPhoto,
  IconUser,
} from "@tabler/icons-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { parseTmTags } from "tmtags";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Separator } from "../ui/separator";
import { ServerError } from "@/types/responses";

export default function TMXMappackCard({
  serverId,
  fmHealth,
  mappack,
  className,
}: {
  serverId: string;
  fmHealth: boolean;
  mappack: TMXMappack;
  className?: string;
}) {
  const [isDownloading, setIsDownloading] = useState(false);

  const onDownload = async () => {
    try {
      if (!fmHealth) {
        toast.error("File manager is not healthy, cannot download mappack");
        return;
      }

      if (isDownloading) return;

      setIsDownloading(true);
      toast.info("Downloading mappack...");

      const { error } = await downloadMappack(
        serverId,
        mappack.MappackId,
        mappack.Name,
      );
      if (error) {
        throw new ServerError(error, "DownloadMappackError");
      }

      toast.success("Mappack successfully downloaded", {
        description: `You can find the maps in the Maps/Downloaded/${mappack.Name} folder`,
      });
    } catch (err) {
      toast.error("Failed to download mappack", {
        description: getErrorMessage(err),
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const onAdd = async () => {
    try {
      if (!fmHealth) {
        toast.error("File manager is not healthy, cannot add mappack");
        return;
      }

      if (isDownloading) return;

      setIsDownloading(true);
      toast.info("Adding mappack to server...");

      const { error } = await addMappackToServer(
        serverId,
        mappack.MappackId,
        mappack.Name,
      );
      if (error) {
        throw new ServerError(error, "AddMappackToServerError");
      }

      toast.success("Mappack successfully added to server");
    } catch (err) {
      toast.error("Failed to add mappack to server", {
        description: getErrorMessage(err),
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card className={cn("flex flex-col flex-1 relative", className)}>
      <div className="relative">
        {mappack.Image ? (
          <Image
            src={`https://trackmania.exchange/mappackthumb/${mappack.MappackId}`}
            fill
            alt={mappack.Name}
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
            !mappack.Image &&
              "bg-gradient-to-t from-black/60 via-black/40 to-transparent",
          )}
        >
          <h3
            className="truncate text-lg font-semibold text-white"
            dangerouslySetInnerHTML={{
              __html: parseTmTags(mappack.Name ?? ""),
            }}
          ></h3>

          <div className="flex items-center gap-2">
            <IconUser className="!size-5 flex-shrink-0" />
            <span
              className="text-sm truncate"
              dangerouslySetInnerHTML={{
                __html: parseTmTags(mappack.Owner.Name ?? ""),
              }}
            ></span>
          </div>
        </div>
      </div>

      <div className="flex flex-col p-2 gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex gap-2 justify-between">
            <div className="flex gap-1 overflow-x-hidden">
              {mappack.Tags.map((tag, index) => (
                <Badge key={index} variant={"outline"}>
                  {tag.Name}
                </Badge>
              ))}
            </div>

            <div className="flex gap-2 items-center">
              <span>{mappack.MapCount}</span>
              <IconMap size={18} />
            </div>
          </div>
        </div>

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
