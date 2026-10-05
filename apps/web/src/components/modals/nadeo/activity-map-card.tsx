import { Card } from "@/components/ui/card";
import { Maps } from "@tmcp/db";
import { cn } from "@/lib/utils";
import { IconPhoto, IconUser } from "@tabler/icons-react";
import Image from "next/image";
import { parseTmTags } from "tmtags";

export default function ActivityMapCard({ map }: { map: Maps }) {
  return (
    <Card className="flex flex-col flex-1 relative">
      <div className="relative">
        {map.thumbnailUrl ? (
          <Image
            src={map.thumbnailUrl}
            fill
            alt={map.name}
            className="static! rounded-lg h-40! object-cover"
          />
        ) : (
          <div className="w-full h-40 rounded-lg flex items-center justify-center">
            <IconPhoto className="text-gray-500" size={48} />
          </div>
        )}
        <div
          className={cn(
            "flex items-center space-x-2 justify-between rounded-b-lg absolute bottom-0 left-0 right-0 bg-white/20 p-2 backdrop-blur-sm dark:bg-black/40 text-white",
            !map.thumbnailUrl &&
              "bg-gradient-to-t from-black/60 via-black/40 to-transparent",
          )}
        >
          <h3
            className="truncate text-lg font-semibold text-white"
            dangerouslySetInnerHTML={{ __html: parseTmTags(map.name) }}
          ></h3>

          <div className="flex items-center gap-2">
            <IconUser className="!size-5 flex-shrink-0" />
            <span
              className="text-sm truncate"
              dangerouslySetInnerHTML={{
                __html: parseTmTags(map.authorNickname),
              }}
            ></span>
          </div>
        </div>
      </div>
    </Card>
  );
}
