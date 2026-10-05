import { ModalContent } from "@/components/modals/modal";
import { DataTable } from "@/components/table/data-table";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatTime } from "@/lib/utils";
import type { MapsWithRecords } from "@/services/database/maps";
import { IconPhoto, IconStopwatch, IconUser } from "@tabler/icons-react";
import Image from "next/image";
import { parseTmTags } from "tmtags";
import { Card } from "../../ui/card";
import { DefaultModalProps } from "../default-props";
import { createColumns } from "./map-records-columns";

export default function MapRecordsModal({
  data,
}: DefaultModalProps<MapsWithRecords>) {
  if (!data) return null;

  const columns = createColumns();

  return (
    <ModalContent className="max-w-[min(64rem,calc(100vw-2rem))]">
      <DialogHeader className="pr-6">
        <DialogTitle>Map Records</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col-reverse sm:flex-row gap-4 flex-1 min-h-0 max-w-full">
        <DataTable
          columns={columns}
          data={data.records.sort((a, b) =>
            a.time === b.time
              ? a.createdAt.getTime() - b.createdAt.getTime()
              : a.time - b.time,
          )} // stable sort by time, then by date
          pagination
          className="overflow-y-auto flex-none"
        />

        <Card className="flex h-min flex-col min-w-72">
          <div className="relative">
            {data.thumbnailUrl ? (
              <Image
                src={data.thumbnailUrl}
                fill
                alt={data.name}
                className="static! rounded-t-xl h-40! object-cover"
              />
            ) : (
              <div className="w-full h-40 rounded-t-xl flex items-center justify-center">
                <IconPhoto className="text-gray-500" size={48} />
              </div>
            )}
            <div className="flex items-center space-x-2 justify-between absolute bottom-0 left-0 right-0 bg-white/20 p-2 backdrop-blur-sm dark:bg-black/40">
              <h3
                className="truncate text-lg font-semibold text-white"
                dangerouslySetInnerHTML={{ __html: parseTmTags(data.name) }}
              ></h3>

              <div className="flex items-center gap-2">
                <IconUser size={20} />
                <span
                  className="text-sm truncate"
                  dangerouslySetInnerHTML={{
                    __html: parseTmTags(data.authorNickname),
                  }}
                ></span>
              </div>
            </div>
          </div>
          <div className="p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-bold text-sm">
                <IconStopwatch size={20} /> Author Time:
              </span>
              <span className="text-sm">{formatTime(data.authorTime)}</span>
            </div>
          </div>
        </Card>
      </div>
    </ModalContent>
  );
}
