import { monthNumberToName } from "@/lib/utils";
import { MonthMapListWithDayMaps } from "@/types/api/nadeo";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import Link from "next/link";
import { Button } from "../ui/button";
import DayMapCard from "./day-map-card";

export default async function TotdMonths({
  serverId,
  fmHealth,
  mapList = null,
  offset,
}: {
  serverId: string;
  fmHealth: boolean;
  mapList?: MonthMapListWithDayMaps | null;
  offset: number;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 justify-between">
        <h2 className="text-xl font-bold truncate">
          {mapList ? `${monthNumberToName(mapList.month)} ${mapList.year}` : ""}
        </h2>

        <div className="flex gap-2">
          <Link href={`/server/${serverId}/nadeo?offset=${offset + 1}`}>
            <Button
              variant="outline"
              collapse="sm"
              disabled={
                !mapList || (mapList.month === 7 && mapList.year === 2020)
              }
            >
              <IconArrowLeft />
              Previous
            </Button>
          </Link>
          <Link
            href={`/server/${serverId}/nadeo?offset=${Math.max(0, offset - 1)}`}
          >
            <Button
              variant="outline"
              collapse="sm"
              disabled={offset <= 0 || !mapList}
            >
              <IconArrowRight />
              Next
            </Button>
          </Link>
        </div>
      </div>

      {mapList && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-4">
          {mapList.days.map((day) => (
            <DayMapCard
              key={day.mapUid}
              serverId={serverId}
              fmHealth={fmHealth}
              day={day}
            />
          ))}
        </div>
      )}
    </div>
  );
}
