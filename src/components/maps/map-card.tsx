import { Card } from "@/components/ui/card";
import { Maps } from "@/lib/prisma/generated";
import { IconPhoto, IconUser } from "@tabler/icons-react";
import Image from "next/image";
import { useRef } from "react";
import { parseTmTags } from "tmtags";
import MapCardActions from "./map-card-actions";
import MapMedals from "./map-medals";

interface MapCardProps {
  map: Maps;
  refetch?: () => void;
}

export default function MapCard({ map, refetch }: MapCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <Card ref={ref} className="flex flex-col flex-1">
      <div className="relative">
        {map.thumbnailUrl ? (
          <Image
            src={map.thumbnailUrl}
            fill
            alt={map.name}
            className="static! rounded-t-lg h-40! object-cover"
          />
        ) : (
          <div className="w-full h-40 rounded-t-lg flex items-center justify-center">
            <IconPhoto className="text-gray-500" size={48} />
          </div>
        )}
        <div className="flex items-center space-x-2 justify-between absolute bottom-0 left-0 right-0 bg-white/20 p-2 backdrop-blur-sm dark:bg-black/40">
          <h3
            className="truncate text-lg font-semibold text-white"
            dangerouslySetInnerHTML={{ __html: parseTmTags(map.name) }}
          ></h3>

          <div className="flex items-center gap-2">
            <IconUser size={20} />
            <span
              className="text-sm truncate"
              dangerouslySetInnerHTML={{
                __html: parseTmTags(map.authorNickname),
              }}
            ></span>
          </div>
        </div>
      </div>
      <div className="p-3 flex flex-1 flex-col gap-2">
        <MapMedals map={map} />
        <MapCardActions map={map} ref={ref} refetch={refetch} />
      </div>
    </Card>
  );
}
