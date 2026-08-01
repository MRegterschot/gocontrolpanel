"use client";

import { getMapList } from "@/actions/database/maps";
import { addMapList } from "@/actions/gbx/map";
import { createColumns as createLocalMapColumns } from "@/app/(gocontroller)/server/[id]/maps/local-maps-columns";
import { Maps } from "@/lib/prisma/generated";
import { getErrorMessage } from "@/lib/utils";
import { LocalMapInfo } from "@/types/map";
import { IconMapPlus } from "@tabler/icons-react";
import { Dispatch, SetStateAction, useState } from "react";
import { toast } from "sonner";
import ConfirmModal from "../modals/confirm-modal";
import { DataTable } from "../table/data-table";
import { Button } from "../ui/button";
import { ServerError } from "@/types/responses";

export default function LocalMapsTable({
  serverId,
  setMapList,
  localMaps,
}: {
  serverId: string;
  setMapList: Dispatch<SetStateAction<(Maps & { path: string })[]>>;
  localMaps: LocalMapInfo[];
}) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [filter, setFilter] = useState<string>("");

  const columns = createLocalMapColumns(serverId, refreshMapList);

  const getFilteredData = () => {
    return localMaps.filter(
      (map) =>
        map.Path.toLowerCase().includes(filter.toLowerCase()) ||
        map.FileName.toLowerCase().includes(filter.toLowerCase()) ||
        map.Name.toLowerCase().includes(filter.toLowerCase()) ||
        map.AuthorNickname.toLowerCase().includes(filter.toLowerCase()),
    );
  };

  const addAllMaps = async () => {
    try {
      const filteredMaps = getFilteredData().map((map) => map.FileName);

      if (filteredMaps.length === 0) {
        toast.error("No maps found with the current filter");
        return;
      }

      const { data: res, error } = await addMapList(serverId, filteredMaps);
      if (error) {
        throw new ServerError(error, "AddMapListError");
      }

      toast.success(`${res} map(s) successfully added`);
      refreshMapList();
    } catch (error) {
      toast.error("Error adding all maps", {
        description: getErrorMessage(error),
      });
    }
  };

  async function refreshMapList() {
    try {
      const { data: newMapList, error } = await getMapList(serverId);
      if (error) {
        throw new ServerError(error, "GetMapListError");
      }
      setMapList(newMapList);
    } catch (error) {
      toast.error("Error refreshing map list", {
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <DataTable
      data={localMaps}
      columns={columns}
      filter={true}
      pagination
      actions={
        <>
          <Button onClick={() => setIsConfirmOpen(true)}>
            <IconMapPlus />
            Add All Maps
          </Button>

          <ConfirmModal
            isOpen={isConfirmOpen}
            onClose={() => setIsConfirmOpen(false)}
            onConfirm={addAllMaps}
            title="Add all maps"
            description={`Are you sure you want to add ${
              getFilteredData().length
            } map(s)? This will add all the maps with the current filter applied.`}
            confirmText="Add"
            cancelText="Cancel"
            variant="default"
          />
        </>
      }
      globalFilter={filter}
      onGlobalFilterChange={setFilter}
    />
  );
}
