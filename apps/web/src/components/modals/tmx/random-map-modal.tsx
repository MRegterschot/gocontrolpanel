"use client";
import TMXMapCard from "@/components/tmx/tmx-map-card";
import { TMXMap } from "@/types/api/tmx";
import { IconX } from "@tabler/icons-react";
import { Card } from "../../ui/card";
import { DefaultModalProps } from "../default-props";

export default function TMXRandomMapModal({
  serverId,
  data,
  closeModal,
}: DefaultModalProps<{
  map: TMXMap;
  fmHealth: boolean;
}>) {
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (!data || !serverId) return null;

  return (
    <Card
      onClick={stopPropagation}
      className="p-6 gap-6 sm:min-w-[400px] max-sm:w-full max-h-[90vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Random Map Details</h1>
        <IconX
          className="h-6 w-6 cursor-pointer text-muted-foreground"
          onClick={closeModal}
        />
      </div>

      {data && (
        <TMXMapCard
          map={data.map}
          serverId={serverId}
          fmHealth={data.fmHealth}
        />
      )}
    </Card>
  );
}
