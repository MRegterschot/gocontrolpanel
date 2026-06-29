"use client";

import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { HetznerLocation } from "@/types/api/hetzner/locations";
import { HetznerServerType } from "@/types/api/hetzner/servers";
import { HetznerSSHKey } from "@/types/api/hetzner/ssh-keys";
import { IconArrowNarrowRight } from "@tabler/icons-react";
import { UseFormReturn } from "react-hook-form";
import Flag from "react-world-flags";
import { AdvancedServerSetupSchemaType } from "./server-setup-schema";

export default function ServerForm({
  form,
  onNext,
  locations,
  serverTypes,
  sshKeys,
}: {
  form: UseFormReturn<AdvancedServerSetupSchemaType>;
  onNext: () => void;
  locations: HetznerLocation[];
  serverTypes: HetznerServerType[];
  sshKeys: HetznerSSHKey[];
}) {
  const selectedServerType = serverTypes.find(
    (type) => type.id.toString() === form.watch("server.serverType"),
  );

  const selectedLocation = locations.find(
    (location) => location.name === form.watch("server.location"),
  );

  const pricing =
    selectedServerType?.prices.find(
      (price) => price.location === selectedLocation?.name,
    ) || selectedServerType?.prices.find((price) => price.location === "fsn1");

  return (
    <form className="gap-4 grid sm:grid-cols-2 sm:gap-8">
      <div className="flex flex-col gap-4">
        <FormElement
          name={"server.name"}
          label="Server Name"
          placeholder="Enter server name"
          isRequired
        />

        <FormElement
          name={"server.serverType"}
          label="Server Type"
          placeholder="Select server type"
          type="select"
          className="w-32"
          options={serverTypes.map((type) => ({
            value: type.id.toString(),
            label: type.name,
          }))}
          isRequired
        />

        {/* Server Type Info */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex flex-col">
            <span className="font-semibold">Description</span>
            <span className="truncate">
              {selectedServerType?.description || "-"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold">Cores</span>
            <span className="truncate">{selectedServerType?.cores || "-"}</span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold">Memory</span>
            <span className="truncate">
              {selectedServerType?.memory
                ? `${selectedServerType.memory} GB`
                : "-"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold">Disk</span>
            <span className="truncate">
              {selectedServerType?.disk ? `${selectedServerType.disk} GB` : "-"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold">CPU Type</span>
            <span className="truncate">
              {selectedServerType?.cpu_type || "-"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold">Hourly Price</span>
            <span className="truncate">
              {pricing
                ? `€${parseFloat(pricing.price_hourly.gross).toFixed(4)}`
                : "-"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold">Monthly Price</span>
            <span className="truncate">
              {pricing
                ? `€${parseFloat(pricing.price_monthly.gross).toFixed(4)}`
                : "-"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold">Included Traffic</span>
            <span className="truncate">
              {pricing
                ? `${Math.floor(
                    pricing.included_traffic / 1000 / 1000 / 1000 / 1000,
                  )} TB`
                : "-"}
            </span>
          </div>
        </div>

        <FormElement
          name={"server.location"}
          label="Location"
          placeholder="Select server location"
          type="select"
          className="w-64"
          options={locations.map((location) => ({
            value: location.name,
            label: location.description,
          }))}
          isRequired
        />

        {/* Location Info */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex flex-col">
            <span className="font-semibold">Country</span>
            <span className="truncate">
              <Flag
                className="h-4"
                code={selectedLocation?.country}
                fallback={selectedLocation?.country || "-"}
              />
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold">City</span>
            <span className="truncate">{selectedLocation?.city || "-"}</span>
          </div>
        </div>

        <FormElement
          name={"server.sshKeys"}
          label="SSH Keys"
          description="Select the SSH keys you want to add to the server."
          placeholder="Select SSH keys"
          type="multi-select"
          options={sshKeys.map((key) => ({
            label: key.name,
            value: key.id.toString(),
          }))}
          rootClassName="w-full max-w-75"
        />

        <FormElement
          name={"server.controller"}
          label="Add Server Controller"
          type="checkbox"
          description="Check this if you want to add a server controller."
        />
      </div>
      <div className="flex flex-col gap-4">
        <FormElement
          name={"server.dediLogin"}
          label="Trackmania Server Login"
          placeholder="Enter server login"
          isRequired
        />

        <FormElement
          name={"server.dediPassword"}
          label="Trackmania Server Password"
          placeholder="Enter server password"
          type="password"
          isRequired
        />

        <FormElement
          name={"server.roomPassword"}
          label="Room Password"
          placeholder="Enter room password"
        />

        <FormElement
          name={"server.superAdminPassword"}
          label="Super Admin Password"
          placeholder="Enter super admin password"
          type="password"
        />

        <FormElement
          name={"server.adminPassword"}
          label="Admin Password"
          placeholder="Enter admin password"
          type="password"
        />

        <FormElement
          name={"server.userPassword"}
          label="User Password"
          placeholder="Enter user password"
          type="password"
        />

        <FormElement
          name={"server.filemanagerPassword"}
          label="File Manager Password"
          placeholder="Enter file manager password"
          type="password"
          description="This password will be used to access the file manager."
        />

        <div className="flex justify-end">
          <Button type="button" className="flex-1 max-w-32" onClick={onNext}>
            Next
            <IconArrowNarrowRight />
          </Button>
        </div>
      </div>
    </form>
  );
}
