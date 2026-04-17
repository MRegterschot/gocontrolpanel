import { Button } from "@/components/ui/button";
import { HetznerServer } from "@/types/api/hetzner/servers";
import { IconX } from "@tabler/icons-react";
import Flag from "react-world-flags";
import { Card } from "../../ui/card";
import { DefaultModalProps } from "../default-props";
import Modal from "../modal";
import HetznerTMServersModal from "./hetzner-tmservers";

export default function HetznerServerDetailsModal({
  closeModal,
  data,
}: DefaultModalProps<{
  projectId: string;
  server: HetznerServer;
}>) {
  if (!data) return null;

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const pricing = data.server.server_type.prices.find(
    (price) => price.location === data.server.datacenter.location.name,
  );

  const serverController = data.server.labels["servercontroller.type"];

  const passwords = {
    superAdmin: data.server.labels["authorization.superadmin.password"],
    admin: data.server.labels["authorization.admin.password"],
    user: data.server.labels["authorization.user.password"],
    filemanager: data.server.labels["filemanager.password"],
  };

  // If there is a label that starts with a number, it is a shared server
  const isSharedServer = Object.keys(data.server.labels).some((key) =>
    key.match(/^\d+\./),
  );

  return (
    <Card
      onClick={stopPropagation}
      className="p-6 gap-6 sm:min-w-100 max-sm:w-full max-h-[90vh] overflow-y-auto"
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
                <span className="truncate">{data.server.id}</span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">Name</span>
                <span className="truncate">{data.server.name}</span>
              </div>
              {!isSharedServer && (
                <div className="flex flex-col">
                  <span className="font-semibold">Controller</span>
                  <span className="truncate">{serverController || "-"}</span>
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-semibold">Created At</span>
                <span className="truncate">
                  {new Date(data.server.created).toLocaleString()}
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
                  {data.server.public_net.ipv4?.ip || "-"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">Private IP Address</span>
                <span className="truncate">
                  {data.server.private_net.map((n) => n.ip).join(", ") || "-"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="text-muted-foreground">Server Type</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col">
                <span className="font-semibold">Name</span>
                <span className="truncate">{data.server.server_type.name}</span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">Description</span>
                <span className="truncate">
                  {data.server.server_type.description}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">Cores</span>
                <span className="truncate">
                  {data.server.server_type.cores}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">Memory</span>
                <span className="truncate">
                  {data.server.server_type.memory} GB
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">Disk</span>
                <span className="truncate">
                  {data.server.server_type.disk} GB
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">CPU Type</span>
                <span className="truncate">
                  {data.server.server_type.cpu_type}
                </span>
              </div>
            </div>
          </div>
          {!isSharedServer ? (
            <div className="flex flex-col gap-2">
              <h4 className="text-muted-foreground">Passwords</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col">
                  <span className="font-semibold">SuperAdmin</span>
                  <span className="truncate">
                    {passwords.superAdmin || "-"}
                  </span>
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
                  <span className="truncate">
                    {passwords.filemanager || "-"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <h4 className="text-muted-foreground">Trackmania Servers</h4>
              <Modal>
                <HetznerTMServersModal data={data} />
                <Button variant={"outline"} className="w-fit">
                  View Trackmania Servers
                </Button>
              </Modal>
            </div>
          )}
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
                  {data.server.outgoing_traffic
                    ? `${Math.floor(data.server.outgoing_traffic / 1000 / 1000)} MB`
                    : "-"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">Ingoing</span>
                <span className="truncate">
                  {data.server.ingoing_traffic
                    ? `${Math.floor(data.server.ingoing_traffic / 1000 / 1000)} MB`
                    : "-"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="text-muted-foreground">data.servercenter</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col">
                <span className="font-semibold">Name</span>
                <span>{data.server.datacenter.name}</span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">Description</span>
                <span className="truncate">
                  {data.server.datacenter.description}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">Location</span>
                <span className="truncate">
                  {data.server.datacenter.location.name}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">Country</span>
                <span>
                  <Flag
                    className="h-4"
                    code={data.server.datacenter.location.country}
                    fallback={data.server.datacenter.location.country}
                  />
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="text-muted-foreground">Image</h4>
            {data.server.image ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col">
                  <span className="font-semibold">Name</span>
                  <span className="truncate">{data.server.image.name}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold">Description</span>
                  <span className="truncate">
                    {data.server.image.description}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold">Image Size</span>
                  <span className="truncate">
                    {data.server.image.image_size
                      ? `${data.server.image.image_size} GB`
                      : "-"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold">Disk Size</span>
                  <span className="truncate">
                    {data.server.image.disk_size} GB
                  </span>
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
