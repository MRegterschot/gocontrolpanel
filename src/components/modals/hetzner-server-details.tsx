import { HetznerServer } from "@/types/api/hetzner/servers";
import { IconX } from "@tabler/icons-react";
import Flag from "react-world-flags";
import { Card } from "../ui/card";
import { DefaultModalProps } from "./default-props";

export default function HetznerServerDetailsModal({
  closeModal,
  data,
}: DefaultModalProps<HetznerServer>) {
  if (!data) return null;

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const pricing = data.server_type.prices.find(
    (price) => price.location === data.datacenter.location.name,
  );

  const passwords = {
    superAdmin: data.labels["authorization.superadmin.password"],
    admin: data.labels["authorization.admin.password"],
    user: data.labels["authorization.user.password"],
    filemanager: data.labels["filemanager.password"],
  };

  return (
    <Card
      onClick={stopPropagation}
      className="p-6 gap-6 sm:min-w-[400px] max-sm:w-full max-h-[90vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Server Details</h1>
        <IconX
          className="h-6 w-6 cursor-pointer text-muted-foreground"
          onClick={closeModal}
        />
      </div>

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
                <span className="font-semibold">Status</span>
                <span className="truncate">{data.status}</span>
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
            <h4 className="text-muted-foreground">Network</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col">
                <span className="font-semibold">IP Address</span>
                <span className="truncate">
                  {data.public_net.ipv4?.ip || "-"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">Private IP Address</span>
                <span className="truncate">
                  {data.private_net.map((n) => n.ip).join(", ") || "-"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="text-muted-foreground">Server Type</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col">
                <span className="font-semibold">Name</span>
                <span className="truncate">{data.server_type.name}</span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">Description</span>
                <span className="truncate">{data.server_type.description}</span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">Cores</span>
                <span className="truncate">{data.server_type.cores}</span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">Memory</span>
                <span className="truncate">{data.server_type.memory} GB</span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">Disk</span>
                <span className="truncate">{data.server_type.disk} GB</span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">CPU Type</span>
                <span className="truncate">{data.server_type.cpu_type}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="text-muted-foreground">Passwords</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col">
                <span className="font-semibold">SuperAdmin</span>
                <span className="truncate">{passwords.superAdmin || "-"}</span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">Admin</span>
                <span className="truncate">{passwords.admin || "-"}</span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">User</span>
                <span className="truncate">{passwords.user || "-"}</span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">File Manager</span>
                <span className="truncate">{passwords.filemanager || "-"}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h4 className="text-muted-foreground">Pricing</h4>
            {pricing ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col">
                  <span className="font-semibold">Hourly Price</span>
                  <span className="truncate">
                    &#8364;{parseFloat(pricing.price_hourly.gross).toFixed(4)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold">Monthly Price</span>
                  <span className="truncate">
                    &#8364;{parseFloat(pricing.price_monthly.gross).toFixed(4)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold truncate">
                    Included Traffic
                  </span>
                  <span className="truncate">
                    {Math.floor(
                      pricing.included_traffic / 1000 / 1000 / 1000 / 1000,
                    )}{" "}
                    TB
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold truncate">
                    Price per TB Traffic
                  </span>
                  <span className="truncate">
                    &#8364;
                    {parseFloat(pricing.price_per_tb_traffic.gross).toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <span>No pricing information available</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="text-muted-foreground">Traffic</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col">
                <span className="font-semibold">Outgoing</span>
                <span className="truncate">
                  {data.outgoing_traffic
                    ? `${Math.floor(data.outgoing_traffic / 1000 / 1000)} MB`
                    : "-"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">Ingoing</span>
                <span className="truncate">
                  {data.ingoing_traffic
                    ? `${Math.floor(data.ingoing_traffic / 1000 / 1000)} MB`
                    : "-"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="text-muted-foreground">Datacenter</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col">
                <span className="font-semibold">Name</span>
                <span>{data.datacenter.name}</span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">Description</span>
                <span className="truncate">{data.datacenter.description}</span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">Location</span>
                <span className="truncate">
                  {data.datacenter.location.name}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">Country</span>
                <span>
                  <Flag
                    className="h-4"
                    code={data.datacenter.location.country}
                    fallback={data.datacenter.location.country}
                  />
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="text-muted-foreground">Image</h4>
            {data.image ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col">
                  <span className="font-semibold">Name</span>
                  <span className="truncate">{data.image.name}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold">Description</span>
                  <span className="truncate">{data.image.description}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold">Image Size</span>
                  <span className="truncate">
                    {data.image.image_size
                      ? `${data.image.image_size} GB`
                      : "-"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold">Disk Size</span>
                  <span className="truncate">{data.image.disk_size} GB</span>
                </div>
              </div>
            ) : (
              <span>No image attached</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
