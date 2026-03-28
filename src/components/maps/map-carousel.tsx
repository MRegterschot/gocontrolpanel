"use client";

import { nextMap } from "@/actions/gbx/game";
import useWebSocket from "@/hooks/use-websocket";
import { Maps } from "@/lib/prisma/generated";
import { cn, getErrorMessage, hasPermissionSync } from "@/lib/utils";
import { routePermissions } from "@/routes";
import {
  IconArrowForwardUp,
  IconLock,
  IconLockOpen,
  IconPlayerTrackNext,
} from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../ui/carousel";
import CarouselMapCard from "./carousel-map-card";

interface MapCarouselProps {
  serverId: string;
  maps: Maps[];
  loop?: boolean;
  startIndex?: number;
  className?: string;
}

export default function MapCarousel({
  serverId,
  maps,
  loop = false,
  startIndex = 0,
  className,
}: MapCarouselProps) {
  const { data: session } = useSession();
  const [api, setApi] = useState<CarouselApi>();
  const [currentIndex, setCurrentIndex] = useState<number>(startIndex);
  const [follow, setFollow] = useState<boolean>(true);
  const [isSwitching, setIsSwitching] = useState<boolean>(false);

  const canMapActions = hasPermissionSync(
    session,
    routePermissions.servers.game.mapActions,
    serverId,
  );

  const followRef = useRef(follow);
  const apiRef = useRef(api);

  // Keep refs in sync with state
  useEffect(() => {
    followRef.current = follow;
  }, [follow]);

  useEffect(() => {
    apiRef.current = api;
  }, [api]);

  const handleMessage = useCallback((type: string, data: any) => {
    switch (type) {
      case "activeMap":
        const index = maps.findIndex((m) => m.uid === data);
        if (index !== -1) {
          setCurrentIndex(index);
          if (followRef.current && apiRef.current) {
            apiRef.current.scrollTo(index);
          }
        }
        break;
      case "endMap":
        setIsSwitching(true);
        break;
      case "startMap":
        const newIndex = maps.findIndex((m) => m.uid === data.mapUid);
        if (newIndex !== -1) {
          setCurrentIndex(newIndex);
          if (followRef.current && apiRef.current) {
            apiRef.current.scrollTo(newIndex);
          }
        }
        setIsSwitching(false);
        break;
    }
  }, []);

  useWebSocket({
    url: `/api/ws/map/${serverId}`,
    onMessage: handleMessage,
  });

  const onNextMap = async () => {
    if (!canMapActions) {
      toast.error("You do not have permission to perform this action.");
      return;
    }

    try {
      const { error } = await nextMap(serverId);
      if (error) {
        throw new Error(error);
      }
      toast.success("Skipped to next map");
    } catch (error) {
      toast.error("Failed to skip to next map", {
        description: getErrorMessage(error),
      });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Carousel
        setApi={setApi}
        opts={{
          loop,
          startIndex,
          align: "center",
        }}
        className={cn("px-12 md:max-w-[calc(100vw-340px)]", className)}
      >
        <CarouselContent>
          {maps.map((map, index) => (
            <CarouselItem
              key={index}
              className="min-[1060px]:basis-1/2 min-[1380px]:basis-1/3 m-auto"
            >
              <CarouselMapCard
                serverId={serverId}
                canMapActions={canMapActions}
                map={map}
                index={index}
                currentIndex={currentIndex}
                isCurrent={index === currentIndex}
                isSwitching={isSwitching}
                total={maps.length}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>

      <div className="flex items-center justify-center gap-6">
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            className="group relative"
            onClick={() => setFollow(!follow)}
          >
            {follow ? <IconLock size={16} /> : <IconLockOpen size={16} />}
            <span>{follow ? "Following" : "Not Following"}</span>
          </Button>

          <Button variant="outline" onClick={() => api?.scrollTo(currentIndex)}>
            <IconArrowForwardUp size={16} />
            <span>Jump to current</span>
          </Button>
        </div>

        {currentIndex === -1 && canMapActions && (
          <Button
            variant="outline"
            onClick={onNextMap}
            disabled={!canMapActions}
          >
            <IconPlayerTrackNext className="mt-[2px]" />
            <span className="hidden min-[450px]:block">Next</span>
          </Button>
        )}
      </div>
    </div>
  );
}
