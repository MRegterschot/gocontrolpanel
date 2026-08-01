"use client";

import {
  addMapToJukebox,
  clearJukebox,
  getJukebox,
  setJukebox,
} from "@/actions/gbx/map";
import { createColumns as createJukeboxColumns } from "@/app/(gocontroller)/server/[id]/maps/jukebox-columns";
import { createColumns as createMapColumns } from "@/app/(gocontroller)/server/[id]/maps/server-maps-columns";
import { Maps } from "@/lib/prisma/generated";
import { getErrorMessage } from "@/lib/utils";
import { JukeboxMap } from "@/types/map";
import { IconDeviceFloppy, IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DndList } from "../dnd/dnd-list";
import DndListHeaders from "../dnd/dnd-list-headers";
import { DataTable } from "../table/data-table";
import { Button } from "../ui/button";
import { ServerError } from "@/types/responses";

interface JukeboxProps {
  serverId: string;
  jukebox: JukeboxMap[];
  maps: Maps[];
}

export default function Jukebox({ serverId, jukebox, maps }: JukeboxProps) {
  const [defaultJukebox, setDefaultJukebox] = useState<JukeboxMap[]>(
    jukebox || [],
  );
  const [jukeboxOrder, setJukeboxOrder] =
    useState<JukeboxMap[]>(defaultJukebox);

  useEffect(() => {
    const intervalIndex = setInterval(async () => {
      const { data: jukebox } = await getJukebox(serverId);

      if (jukebox[0]?.id !== jukeboxOrder[0]?.id) {
        setJukeboxOrder(jukebox);
        setDefaultJukebox(jukebox);
      }
    }, 10000);

    return () => clearInterval(intervalIndex);
  }, [jukeboxOrder, serverId]);

  async function saveJukebox() {
    try {
      const { error } = await setJukebox(serverId, jukeboxOrder);
      if (error) {
        throw new ServerError(error, "SetJukeboxError");
      }
      setDefaultJukebox(jukeboxOrder);

      toast.success("Jukebox successfully saved");
    } catch (error) {
      toast.error("Error saving jukebox", {
        description: getErrorMessage(error),
      });
    }
  }

  async function onRemoveMap(map: JukeboxMap) {
    const newJukebox = jukeboxOrder.filter((m) => m.id !== map.id);
    setJukeboxOrder(newJukebox);
  }

  async function onAddMap(map: Maps) {
    try {
      const { data: newMap, error } = await addMapToJukebox(serverId, map);
      if (error) {
        throw new ServerError(error, "AddMapToJukeboxError");
      }
      setJukeboxOrder((prev) => [...prev, newMap]);
      setDefaultJukebox((prev) => [...prev, newMap]);
      toast.success("Map successfully added to jukebox");
    } catch (error) {
      toast.error("Error adding map to jukebox", {
        description: getErrorMessage(error),
      });
    }
  }

  async function onClearJukebox() {
    try {
      const { error } = await clearJukebox(serverId);
      if (error) {
        throw new ServerError(error, "ClearJukeboxError");
      }
      setJukeboxOrder([]);
      setDefaultJukebox([]);
      toast.success("Jukebox successfully cleared");
    } catch (error) {
      toast.error("Error clearing jukebox", {
        description: getErrorMessage(error),
      });
    }
  }

  const jukeboxColumns = createJukeboxColumns(onRemoveMap);
  const mapColumns = createMapColumns(onAddMap);

  return (
    <div className="flex flex-col gap-5">
      {jukeboxOrder.length === 0 ? (
        <p className="text-sm text-muted-foreground">No maps in jukebox.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <DndListHeaders columns={jukeboxColumns} />
          <DndList
            columns={jukeboxColumns}
            data={jukeboxOrder}
            setData={setJukeboxOrder}
            serverId={serverId}
          />
          <div className="flex gap-2 ml-auto">
            <Button variant={"destructive"} onClick={onClearJukebox}>
              <IconTrash />
              Clear
            </Button>

            <Button onClick={saveJukebox}>
              <IconDeviceFloppy />
              Save
            </Button>
          </div>
        </div>
      )}

      <DataTable data={maps} columns={mapColumns} pagination />
    </div>
  );
}
