"use client";

import { ModalContent } from "@/components/modals/modal";
import TMXMapCard from "@/components/tmx/tmx-map-card";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TMXMap } from "@/types/api/tmx";
import { DefaultModalProps } from "../default-props";

export default function TMXRandomMapModal({
  serverId,
  data,
}: DefaultModalProps<{
  map: TMXMap;
  fmHealth: boolean;
}>) {
  if (!data || !serverId) return null;

  return (
    <ModalContent>
      <DialogHeader className="pr-6">
        <DialogTitle>Random Map Details</DialogTitle>
      </DialogHeader>

      {data && (
        <TMXMapCard
          map={data.map}
          serverId={serverId}
          fmHealth={data.fmHealth}
        />
      )}
    </ModalContent>
  );
}
