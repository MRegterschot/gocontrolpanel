import { MatchesWithMapAndRecords } from "@/actions/database/matches";
import { DataTable } from "@/components/table/data-table";
import { formatTime } from "@/lib/utils";
import {
  IconPhoto,
  IconScript,
  IconStopwatch,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import Image from "next/image";
import { parseTmTags } from "tmtags";
import { Card } from "../../ui/card";
import { DefaultModalProps } from "../default-props";
import { createColumns } from "./match-details-columns";

export default function MatchDetailsModal({
  closeModal,
  data,
}: DefaultModalProps<MatchesWithMapAndRecords>) {
  if (!data) return null;

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const columns = createColumns(
    data.records.some((record) => record.round),
    data.records.some((record) => record.points),
  );

  return (
    <Card
      onClick={stopPropagation}
      className="p-6 gap-6 sm:min-w-[400px] max-sm:w-full max-h-[90vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Match Details</h1>
        <IconX
          className="h-6 w-6 cursor-pointer text-muted-foreground"
          onClick={closeModal}
        />
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-4 flex-1 min-h-0 max-w-full">
        <DataTable
          columns={columns}
          data={data.records.sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
          )}
          pagination
          className="overflow-y-auto flex-none"
        />

        <Card className="flex h-min flex-col">
          <div className="relative">
            {data.map.thumbnailUrl ? (
              <Image
                src={data.map.thumbnailUrl}
                fill
                alt={data.map.name}
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
                dangerouslySetInnerHTML={{ __html: parseTmTags(data.map.name) }}
              ></h3>

              <div className="flex items-center gap-2">
                <IconUser size={20} />
                <span
                  className="text-sm truncate"
                  dangerouslySetInnerHTML={{
                    __html: parseTmTags(data.map.authorNickname),
                  }}
                ></span>
              </div>
            </div>
          </div>
          <div className="p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-bold text-sm">
                <IconScript size={20} /> Mode:
              </span>
              <span className="text-sm truncate">{data.mode}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-bold text-sm">
                <IconStopwatch size={20} /> Author Time:
              </span>
              <span className="text-sm">{formatTime(data.map.authorTime)}</span>
            </div>
          </div>
        </Card>
      </div>
    </Card>
  );
}
