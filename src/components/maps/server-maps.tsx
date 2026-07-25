"use client";

import { Maps } from "@/lib/prisma/generated";
import { useState } from "react";
import LocalMapsTable from "./local-maps-table";
import MapOrder from "./map-order";
import { LocalMapInfo } from "@/types/map";

export default function ServerMaps({
  serverId,
  maps,
  fmHealth,
  localMaps,
}: {
  serverId: string;
  maps: (Maps & { path: string })[];
  fmHealth: boolean;
  localMaps: LocalMapInfo[];
}) {
  const [defaultMapList, setDefaultMapList] =
    useState<(Maps & { path: string })[]>(maps);

  return (
    <>
      <MapOrder
        mapList={defaultMapList}
        setMapList={setDefaultMapList}
        serverId={serverId}
      />
      {fmHealth && (
        <LocalMapsTable serverId={serverId} setMapList={setDefaultMapList} localMaps={localMaps} />
      )}
    </>
  );
}
