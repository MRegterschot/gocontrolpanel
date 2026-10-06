import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HetznerVolume } from "@/types/api/hetzner/volumes";
import Flag from "react-world-flags";
import { DefaultModalProps } from "../default-props";

export default function HetznerVolumeDetailsModal({
  data,
}: DefaultModalProps<HetznerVolume>) {
  if (!data) return null;

  return (
    <ModalContent className="max-w-[min(64rem,calc(100vw-2rem))]">
      <DialogHeader className="pr-6">
        <DialogTitle>Volume Details</DialogTitle>
      </DialogHeader>

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
    </ModalContent>
  );
}
