import { HetznerVolume } from "@/types/api/hetzner/volumes";
import { IconX } from "@tabler/icons-react";
import Flag from "react-world-flags";
import { Card } from "../ui/card";
import { DefaultModalProps } from "./default-props";

export default function HetznerVolumeDetailsModal({
  closeModal,
  data,
}: DefaultModalProps<HetznerVolume>) {
  if (!data) return null;

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Card
      onClick={stopPropagation}
      className="p-6 gap-6 sm:min-w-[400px] max-sm:w-full max-h-[90vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Volume Details</h1>
        <IconX
          className="h-6 w-6 cursor-pointer text-muted-foreground"
          onClick={closeModal}
        />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h4 className="text-muted-foreground">General</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col">
              <span className="font-semibold">ID</span>
              <span className="truncate">{data.id}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Name</span>
              <span className="truncate">{data.name}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Size</span>
              <span className="truncate">{data.size}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Server</span>
              <span className="truncate">{data.server || "-"}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Created At</span>
              <span className="truncate">
                {new Date(data.created).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h4 className="text-muted-foreground">Location</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col">
              <span className="font-semibold">ID</span>
              <span className="truncate">{data.location.id}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Name</span>
              <span className="truncate">{data.location.name}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Description</span>
              <span className="truncate">{data.location.description}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Country</span>
              <span>
                <Flag
                  className="h-4"
                  code={data.location.country}
                  fallback={data.location.country}
                />
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
