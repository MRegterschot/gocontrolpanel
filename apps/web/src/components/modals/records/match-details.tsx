"use client";

import { ModalContent } from "@/components/modals/modal";
import { DataTable } from "@/components/table/data-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatTime, hasPermissionSync } from "@/lib/utils";
import type { MatchesWithMapAndRecords } from "@/services/database/matches";
import {
  IconPhoto,
  IconScript,
  IconStopwatch,
  IconUser,
} from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";
import { parseTmTags } from "tmtags";
import { Card } from "../../ui/card";
import { DefaultModalProps } from "../default-props";
import Modal from "../modal";
import { createColumns } from "./match-details-columns";
import SendEcmModal from "./send-ecm";

export default function MatchDetailsModal({
  data,
}: DefaultModalProps<MatchesWithMapAndRecords>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSendOpen, setIsSendOpen] = useState(false);
  const { data: session } = useSession();
  if (!data) return null;
  const canSend = hasPermissionSync(
    session,
    ["servers:id:admin", "group:servers:id:admin"],
    data.serverId,
  );
  const records = [...data.records].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  const selectedRecords = records.filter((record) =>
    selectedIds.has(record.id),
  );
  const rounds = [
    ...new Set(
      records
        .map((record) => record.round)
        .filter((round): round is number => round !== null),
    ),
  ].sort((a, b) => a - b);

  const columns = createColumns(
    data.records.some((record) => record.round),
    data.records.some((record) => record.points),
  );

  if (canSend) {
    columns.unshift({
      id: "select",
      size: 40,
      header: () => (
        <Checkbox
          aria-label="Select all records"
          checked={
            selectedRecords.length === records.length && records.length > 0
              ? true
              : selectedRecords.length > 0
                ? "indeterminate"
                : false
          }
          onCheckedChange={(checked) =>
            setSelectedIds(
              checked === true
                ? new Set(records.map((record) => record.id))
                : new Set(),
            )
          }
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label={`Select record for ${row.original.user?.nickName || row.original.login || "player"}, round ${row.original.round ?? "unknown"}`}
          checked={selectedIds.has(row.original.id)}
          onCheckedChange={(checked) =>
            setSelectedIds((previous) => {
              const next = new Set(previous);
              if (checked === true) next.add(row.original.id);
              else next.delete(row.original.id);
              return next;
            })
          }
        />
      ),
    });
  }

  return (
    <ModalContent className="max-w-[min(64rem,calc(100vw-2rem))]">
      <DialogHeader className="pr-6">
        <DialogTitle>Match Details</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col-reverse sm:flex-row gap-4 flex-1 min-h-0 max-w-full">
        <div className="flex-1 min-w-0">
          <DataTable
            columns={columns}
            data={records}
            actions={
              canSend && (
                <div className="flex flex-wrap items-center gap-2">
                  {rounds.length > 0 && (
                    <Select
                      value=""
                      onValueChange={(round) =>
                        setSelectedIds(
                          new Set(
                            records
                              .filter(
                                (record) => record.round === Number(round),
                              )
                              .map((record) => record.id),
                          ),
                        )
                      }
                    >
                      <SelectTrigger
                        aria-label="Select a round"
                        className="w-auto"
                      >
                        <SelectValue placeholder="Select a round" />
                      </SelectTrigger>
                      <SelectContent>
                        {rounds.map((round) => (
                          <SelectItem key={round} value={String(round)}>
                            Round {round}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {selectedRecords.length} selected
                  </span>
                  <Button
                    variant="outline"
                    disabled={!selectedRecords.length}
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Clear
                  </Button>
                  <Button
                    disabled={!selectedRecords.length}
                    onClick={() => setIsSendOpen(true)}
                  >
                    Send to eCircuitMania
                  </Button>
                </div>
              )
            }
            pagination
            className="overflow-y-auto flex-none"
          />
        </div>

        <Card className="flex h-min flex-col sm:w-64 shrink-0">
          <div className="relative">
            {data.map.thumbnailUrl ? (
              <Image
                src={data.map.thumbnailUrl}
                fill
                alt={data.map.name}
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
      <Modal isOpen={isSendOpen} setIsOpen={setIsSendOpen}>
        <SendEcmModal
          serverId={data.serverId}
          matchId={data.id}
          records={selectedRecords}
        />
      </Modal>
    </ModalContent>
  );
}
