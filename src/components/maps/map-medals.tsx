import { Maps } from "@/lib/prisma/generated";
import { IconMedal } from "@tabler/icons-react";
import TimeDisplay from "../time-display";
import { Card } from "../ui/card";

interface MapMedalsProps {
  map: Maps;
}

export default function MapMedals({ map }: MapMedalsProps) {
  return (
    <Card className="flex flex-1 p-2 flex-row items-center rounded-sm dark:bg-black/40 border-none justify-around">
      <div className="flex flex-col items-center">
        <IconMedal className="text-green-700" size={24} />
        <TimeDisplay time={map.authorTime} className="text-sm" />
      </div>
      <div className="flex flex-col items-center">
        <IconMedal className="text-yellow-500" size={24} />
        <TimeDisplay time={map.goldTime} className="text-sm" />
      </div>
      <div className="flex flex-col items-center">
        <IconMedal className="text-gray-400" size={24} />
        <TimeDisplay time={map.silverTime} className="text-sm" />
      </div>
      <div className="flex flex-col items-center">
        <IconMedal className="text-amber-700" size={24} />
        <TimeDisplay time={map.bronzeTime} className="text-sm" />
      </div>
    </Card>
  );
}
