import { nextMap, restartMap } from "@/actions/gbx/game";
import { jumpToMap } from "@/actions/gbx/map";
import { Maps } from "@/lib/prisma/generated";
import { cn, getErrorMessage } from "@/lib/utils";
import {
  IconBounceRight,
  IconPhoto,
  IconPlayerTrackNext,
  IconPlayerTrackPrev,
  IconRotateClockwise,
  IconUser,
} from "@tabler/icons-react";
import Image from "next/image";
import { toast } from "sonner";
import { parseTmTags, stripTmTags } from "tmtags";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { ServerError } from "@/types/responses";

interface CarouselMapCardProps {
  map: Maps;
  index: number;
  currentIndex?: number;
  isCurrent?: boolean;
  isSwitching?: boolean;
  total: number;
  serverId: string;
  canMapActions: boolean;
  className?: string;
}

export default function CarouselMapCard({
  map,
  index,
  currentIndex = 0,
  isCurrent = false,
  isSwitching = false,
  total,
  serverId,
  canMapActions,
  className,
}: CarouselMapCardProps) {
  const onPreviousMap = async () => {
    if (!canMapActions) {
      toast.error("You do not have permission to perform this action.");
      return;
    }

    try {
      const previousIndex = index - 1 < 0 ? total - 1 : index - 1;
      const { error } = await jumpToMap(serverId, previousIndex);
      if (error) {
        throw new ServerError(error, "JumpToMapError");
      }
      toast.success("Gone back to previous map");
    } catch (error) {
      toast.error("Failed to jump to previous map", {
        description: getErrorMessage(error),
      });
    }
  };

  const onRestartMap = async () => {
    if (!canMapActions) {
      toast.error("You do not have permission to perform this action.");
      return;
    }

    try {
      const { error } = await restartMap(serverId);
      if (error) {
        throw new ServerError(error, "RestartMapError");
      }
      toast.success("Restarted map", {
        description: `Restarted ${stripTmTags(map.name)} by ${map.authorNickname}`,
      });
    } catch (error) {
      toast.error("Failed to restart map", {
        description: getErrorMessage(error),
      });
    }
  };

  const onNextMap = async () => {
    if (!canMapActions) {
      toast.error("You do not have permission to perform this action.");
      return;
    }

    try {
      const { error } = await nextMap(serverId);
      if (error) {
        throw new ServerError(error, "NextMapError");
      }
      toast.success("Skipped to next map");
    } catch (error) {
      toast.error("Failed to skip to next map", {
        description: getErrorMessage(error),
      });
    }
  };

  const onJumpToMap = async () => {
    if (!canMapActions) {
      toast.error("You do not have permission to perform this action.");
      return;
    }

    try {
      const { error } = await jumpToMap(serverId, index);
      if (error) {
        throw new ServerError(error, "JumpToMapError");
      }
      toast.success("Jumped to map", {
        description: `Jumped to ${stripTmTags(map.name)} by ${map.authorNickname}`,
      });
    } catch (error) {
      toast.error("Failed to jump to map", {
        description: getErrorMessage(error),
      });
    }
  };

  return (
    <Card className={cn("flex flex-col flex-1 relative", className)}>
      <div className="relative">
        {map.thumbnailUrl ? (
          <Image
            src={map.thumbnailUrl}
            fill
            alt={map.name}
            className={cn(
              "static! rounded-t-lg h-40! object-cover",
              !canMapActions && "rounded-b-lg",
            )}
            loading={
              isCurrent ||
              (index > currentIndex && index <= currentIndex + 5) ||
              (currentIndex + 5 >= total && index <= (currentIndex + 5) % total)
                ? "eager"
                : "lazy"
            }
            priority={isCurrent}
          />
        ) : (
          <div
            className={cn(
              "w-full h-40 rounded-t-lg flex items-center justify-center",
              !canMapActions && "rounded-b-lg",
            )}
          >
            <IconPhoto className="text-gray-500" size={48} />
          </div>
        )}
        <div
          className={cn(
            "flex items-center space-x-2 justify-between absolute bottom-0 left-0 right-0 bg-white/20 p-2 backdrop-blur-sm dark:bg-black/40 text-white",
            !canMapActions && "rounded-b-lg",
            !map.thumbnailUrl &&
              "bg-linear-to-t from-black/60 via-black/40 to-transparent",
          )}
        >
          <h3
            className="truncate text-lg font-semibold text-white"
            dangerouslySetInnerHTML={{ __html: parseTmTags(map.name) }}
          ></h3>

          <div className="flex items-center gap-2">
            <IconUser className="size-5! shrink-0" />
            <span
              className="text-sm truncate"
              dangerouslySetInnerHTML={{
                __html: parseTmTags(map.authorNickname),
              }}
            ></span>
          </div>
        </div>
      </div>
      {canMapActions && (
        <div className="p-3 flex gap-2 justify-between">
          {isCurrent ? (
            <>
              <Button
                variant={"outline"}
                size="sm"
                collapse="sm"
                onClick={onPreviousMap}
              >
                <IconPlayerTrackPrev />
                Previous
              </Button>

              <Button
                variant={"outline"}
                size="sm"
                collapse="sm"
                onClick={onRestartMap}
              >
                <IconRotateClockwise className="rotate-180" />
                Restart
              </Button>

              <Button
                variant={"outline"}
                size="sm"
                collapse="sm"
                onClick={onNextMap}
              >
                <IconPlayerTrackNext />
                Next
              </Button>
            </>
          ) : (
            <Button
              variant={"outline"}
              size="sm"
              collapse="sm"
              onClick={onJumpToMap}
            >
              <IconBounceRight />
              Jump to Map
            </Button>
          )}
        </div>
      )}

      {isCurrent && (
        <Badge
          variant={"outline"}
          className="absolute top-2 left-2 z-10 bg-white dark:bg-black flex gap-2"
        >
          {isSwitching ? (
            <>
              <span className="bg-yellow-500 w-2 h-2 rounded-full"></span>
              Switching Maps
            </>
          ) : (
            <>
              <span className="bg-green-500 w-2 h-2 rounded-full"></span>
              Current Map
            </>
          )}
        </Badge>
      )}
    </Card>
  );
}
