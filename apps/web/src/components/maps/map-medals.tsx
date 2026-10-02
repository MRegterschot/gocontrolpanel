import { IconMedal } from "@tabler/icons-react";
import TimeDisplay from "../time-display";
import { Card } from "../ui/card";

interface MapMedalsProps {
  medals: {
    authorTime: number;
    goldTime: number;
    silverTime: number;
    bronzeTime: number;
  };
}

export default function MapMedals({ medals }: MapMedalsProps) {
  return (
    <Card className="flex flex-1 p-2 flex-row items-center rounded-sm dark:bg-black/40 border-none justify-around">
      <div className="flex flex-col items-center">
        <IconMedal className="text-green-700" size={24} />
        <TimeDisplay time={medals.authorTime} className="text-sm" />
      </div>
      <div className="flex flex-col items-center">
        <IconMedal className="text-yellow-500" size={24} />
        <TimeDisplay time={medals.goldTime} className="text-sm" />
      </div>
      <div className="flex flex-col items-center">
        <IconMedal className="text-gray-400" size={24} />
        <TimeDisplay time={medals.silverTime} className="text-sm" />
      </div>
      <div className="flex flex-col items-center">
        <IconMedal className="text-amber-700" size={24} />
        <TimeDisplay time={medals.bronzeTime} className="text-sm" />
      </div>
    </Card>
  );
}
