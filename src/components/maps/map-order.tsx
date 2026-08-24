"use client";
import { getMapList } from "@/actions/database/maps";
import { addMapList, removeMapList } from "@/actions/gbx/map";
import { createColumns } from "@/app/(gocontroller)/server/[id]/maps/map-order-columns";
import { Maps } from "@/lib/prisma/generated";
import { getDivergingList, getErrorMessage } from "@/lib/utils";
import { ServerError } from "@/types/responses";
import {
  IconDeviceFloppy,
  IconMapMinus,
  IconRefresh,
  IconRotate,
} from "@tabler/icons-react";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { toast } from "sonner";
import { DndList } from "../dnd/dnd-list";
import DndListHeaders from "../dnd/dnd-list-headers";
import ConfirmModal from "../modals/confirm-modal";
import { Button } from "../ui/button";

export default function MapOrder({
  mapList,
  setMapList,
  serverId,
}: {
  mapList: (Maps & { path: string })[];
  setMapList: Dispatch<SetStateAction<(Maps & { path: string })[]>>;
  serverId: string;
}) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const [mapOrder, setMapOrder] =
    useState<(Maps & { path: string })[]>(mapList);

  useEffect(() => {
    setMapOrder(mapList);
  }, [mapList]);

  async function saveMapOrder() {
    try {
      const files = getDivergingList(mapList, mapOrder, "uid")[1].map(
        (map) => map.path,
      );

      if (!files.length || files.length == 0) return;

      const { error: removeError } = await removeMapList(serverId, files);
      if (removeError) {
        throw new ServerError(removeError, "RemoveMapListError");
      }

      const { error: addError } = await addMapList(serverId, files);
      if (addError) {
        throw new ServerError(addError, "AddMapListError");
      }

      setMapList(mapOrder);

      toast.success("Map order successfully saved");
    } catch (error) {
      toast.error("Error saving map order", {
        description: getErrorMessage(error),
      });
    }
  }

  function resetMapOrder() {
    setMapOrder(mapList);
  }

  function onRemoveMap(map: Maps) {
    const newMapOrder = mapOrder.filter((m) => m.uid !== map.uid);
    setMapOrder(newMapOrder);
    setMapList(newMapOrder);
  }

  async function removeAllMaps() {
    try {
      const filesToRemove = mapOrder
        .map((m) => m.path)
        .splice(0, mapOrder.length - 1);

      const { error } = await removeMapList(serverId, filesToRemove);
      if (error) {
        throw new ServerError(error, "RemoveAllMapsError");
      }

      setMapOrder([mapOrder[mapOrder.length - 1]]);
      setMapList([mapOrder[mapOrder.length - 1]]);
      toast.success("All maps succesfully removed", {
        description:
          "Did not remove the last map to prevent the server from crashing.",
      });
    } catch (error) {
      toast.error("Error removing maps", {
        description: getErrorMessage(error),
      });
    }
  }

  async function onRefreshMapList() {
    try {
      const { ok, data: newMapList, error } = await getMapList(serverId);
      if (!ok) {
        throw new ServerError(error, "RefreshMapListError");
      }
      setMapOrder(newMapList);
      setMapList(newMapList);
      toast.success("Map list successfully refreshed");
    } catch (error) {
      toast.error("Error refreshing map list", {
        description: getErrorMessage(error),
      });
    }
  }

  const columns = createColumns(onRemoveMap);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <DndListHeaders columns={columns} />
        <DndList
          columns={columns}
          data={mapOrder}
          setData={setMapOrder}
          serverId={serverId}
        />
      </div>
      <div className="flex gap-2 ml-auto">
        <Button variant="outline" collapse="sm" onClick={onRefreshMapList}>
          <IconRefresh />
          Refresh
        </Button>

        <Button
          variant="destructive"
          collapse="sm"
          onClick={() => setIsConfirmOpen(true)}
        >
          <IconMapMinus />
          Remove All
        </Button>

        <ConfirmModal
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={removeAllMaps}
          title="Remove all maps"
          description="Are you sure you want to remove all maps? This will not remove the last map to prevent the server from crashing."
          confirmText="Remove"
          cancelText="Cancel"
        />

        <Button variant="outline" collapse="sm" onClick={resetMapOrder}>
          <IconRotate className="rotate-180" />
          Reset
        </Button>
        <Button onClick={saveMapOrder} collapse="sm">
          <IconDeviceFloppy />
          Save
        </Button>
      </div>
    </div>
  );
}
