import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HetznerNetwork } from "@/types/api/hetzner/networks";
import { DefaultModalProps } from "../default-props";

export default function HetznerNetworkDetailsModal({
  data,
}: DefaultModalProps<HetznerNetwork>) {
  if (!data) return null;

  return (
    <ModalContent className="max-w-[min(64rem,calc(100vw-2rem))]">
      <DialogHeader className="pr-6">
        <DialogTitle>Network Details</DialogTitle>
      </DialogHeader>

      <div className="gap-4 grid md:grid-cols-2 md:gap-8">
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
                <span className="font-semibold">IP Range</span>
                <span className="truncate">{data.ip_range}</span>
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
            <h4 className="text-muted-foreground">Subnets</h4>
            {data.subnets.length > 0 ? (
              data.subnets.map((subnet, index) => (
                <div className="grid grid-cols-2 gap-2" key={index}>
                  <div className="flex flex-col">
                    <span className="font-semibold">Type</span>
                    <span className="truncate">{subnet.type}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold">IP Range</span>
                    <span className="truncate">{subnet.ip_range || "-"}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold">Network Zone</span>
                    <span className="truncate">{subnet.network_zone}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold">Gateway</span>
                    <span className="truncate">{subnet.gateway}</span>
                  </div>
                </div>
              ))
            ) : (
              <span>-</span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h4 className="text-muted-foreground">Routes</h4>
            {data.routes.length > 0 ? (
              data.routes.map((route, index) => (
                <div className="grid grid-cols-2 gap-2" key={index}>
                  <div className="flex flex-col">
                    <span className="font-semibold">Destination</span>
                    <span className="truncate">{route.destination}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold">Gateway</span>
                    <span className="truncate">{route.gateway}</span>
                  </div>
                </div>
              ))
            ) : (
              <span>-</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="text-muted-foreground">Resources</h4>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex flex-col">
                <span className="font-semibold">Servers</span>
                <span className="truncate">
                  {data.servers.length > 0 ? data.servers.join(", ") : "-"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">Load Balancers</span>
                <span className="truncate">
                  {data.load_balancers.length > 0
                    ? data.load_balancers.join(", ")
                    : "-"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalContent>
  );
}
