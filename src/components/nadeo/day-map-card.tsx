"use client";
import { addMapToServer, downloadMapFromUrl } from "@/actions/nadeo/maps";
import { cn, getErrorMessage, weekDayNumberToName } from "@/lib/utils";
import { DayWithMap } from "@/types/api/nadeo";
import {
  IconDownload,
  IconMapPlus,
  IconPhoto,
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

export default function DayMapCard({
  serverId,
  fmHealth,
  day,
  className,
}: {
  serverId: string;
  fmHealth: boolean;
  day: DayWithMap;
  className?: string;
}) {
  const [isDownloading, setIsDownloading] = useState(false);

  const onDownload = async () => {
    try {
      if (!fmHealth) {
        toast.error("File manager is not healthy, cannot download map");
        return;
      }

      if (!day.map.fileUrl) {
        toast.error("Map does not have a valid download URL");
        return;
      }

      if (isDownloading) return;

      setIsDownloading(true);

      const { error } = await downloadMapFromUrl(
        serverId,
        day.map.fileUrl,
        day.map.fileName,
      );
      if (error) {
        throw new Error(error);
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

      if (!day.map.fileUrl) {
        toast.error("Map does not have a valid download URL");
        return;
      }

      if (isDownloading) return;

      setIsDownloading(true);

      const { error } = await addMapToServer(
        serverId,
        day.map.fileUrl,
        day.map.fileName,
      );
      if (error) {
        throw new Error(error);
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
        {day.map.thumbnailUrl ? (
          <Image
            src={day.map.thumbnailUrl}
            fill
            alt={day.map.name}
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
            !day.map.thumbnailUrl &&
              "bg-gradient-to-t from-black/60 via-black/40 to-transparent",
          )}
        >
          <h3
            className="truncate text-lg font-semibold text-white"
            dangerouslySetInnerHTML={{
              __html: parseTmTags(day.map.name ?? ""),
            }}
          ></h3>

          <div className="flex items-center gap-2">
            <IconUser className="!size-5 flex-shrink-0" />
            <span
              className="text-sm truncate"
              dangerouslySetInnerHTML={{
                __html: parseTmTags(day.map.authorNickname),
              }}
            ></span>
          </div>
        </div>
      </div>

      <div className="flex flex-col p-2 gap-2">
        <MapMedals
          medals={{
            ...day.map,
          }}
        />

        {fmHealth && day.map.fileUrl && (
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

      <Badge
        variant={"outline"}
        className="absolute top-2 left-2 z-1 bg-white dark:bg-black flex gap-2 font-bold"
      >
        {day.monthDay}, {weekDayNumberToName(day.day)}
      </Badge>
    </Card>
  );
}
