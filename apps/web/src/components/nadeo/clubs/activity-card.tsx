import CampaignDetailsModal from "@/components/modals/nadeo/campaign-details";
import { capitalizeWords, cn } from "@/lib/utils";
import { ClubActivity } from "@/types/api/nadeo";
import {
  IconCar,
  IconChartBar,
  IconFolder,
  IconMap,
  IconMapUp,
  IconPhoto,
  IconServer,
} from "@tabler/icons-react";
import { MoreHorizontal } from "lucide-react";
import Image from "next/image";
import { parseTmTags } from "tmtags";
import Modal from "../../modals/modal";
import { default as RoomDetailsModal } from "../../modals/nadeo/room-details";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";

export default function ActivityCard({
  serverId,
  fmHealth,
  activity,
}: {
  serverId: string;
  fmHealth: boolean;
  activity: ClubActivity;
}) {
  const getActivityIcon = (type: string | undefined) => {
    switch (type) {
      case "campaign":
        return <IconMap size={18} />;
      case "room":
        return <IconServer size={18} />;
      case "folder":
        return <IconFolder size={18} />;
      case "ranking-club":
      case "ranking-daily":
        return <IconChartBar size={18} />;
      case "skin-upload":
        return <IconCar size={18} />;
      case "map-upload":
        return <IconMapUp size={18} />;
    }
  };

  return (
    <Card className="flex flex-col flex-1 relative">
      <div className="relative">
        {activity.mediaUrl ? (
          <Image
            src={activity.mediaUrl}
            fill
            alt={activity.name}
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
            !activity.mediaUrl &&
              "bg-gradient-to-t from-black/60 via-black/40 to-transparent",
          )}
        >
          <h3
            className="truncate text-lg font-semibold"
            dangerouslySetInnerHTML={{
              __html: parseTmTags(activity.name ?? ""),
            }}
          ></h3>

          <div className="flex items-center gap-2">
            {getActivityIcon(activity.activityType)}

            <span className="text-sm truncate">
              {capitalizeWords(
                activity.activityType?.replaceAll("-", " ") || "Unknown",
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-between gap-2 p-2 h-10">
        <div className="flex gap-1 overflow-x-hidden">
          {activity.public && <Badge variant={"outline"}>Public</Badge>}
          {activity.active && <Badge variant={"outline"}>Active</Badge>}
          {activity.featured && <Badge variant={"outline"}>Featured</Badge>}
          {activity.password && <Badge variant={"outline"}>Password</Badge>}
        </div>

        {activity.activityType === "room" && activity.public && (
          <Modal>
            <RoomDetailsModal
              data={{
                activity,
                serverId,
                fmHealth,
              }}
            />
            <Button variant="ghost" className="size-6 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </Modal>
        )}

        {activity.activityType === "campaign" && activity.public && (
          <Modal>
            <CampaignDetailsModal
              data={{
                activity,
                serverId,
                fmHealth,
              }}
            />
            <Button variant="ghost" className="size-6 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </Modal>
        )}
      </div>
    </Card>
  );
}
