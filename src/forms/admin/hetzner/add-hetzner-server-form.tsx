"use client";

import { getHetznerImages } from "@/actions/hetzner/images";
import { getHetznerLocations } from "@/actions/hetzner/locations";
import { getServerTypes } from "@/actions/hetzner/server-types";
import { createHetznerServer } from "@/actions/hetzner/servers";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/utils";
import { HetznerLocation } from "@/types/api/hetzner/locations";
import { HetznerImage, HetznerServerType } from "@/types/api/hetzner/servers";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Flag from "react-world-flags";
import { toast } from "sonner";
import {
  AddHetznerServerSchema,
  AddHetznerServerSchemaType,
} from "./add-hetzner-server-schema";

export default function AddHetznerServerForm({
  projectId,
  callback,
}: {
  projectId: string;
  callback?: () => void;
}) {
  const [locations, setLocations] = useState<HetznerLocation[]>([]);
  const [serverTypes, setServerTypes] = useState<HetznerServerType[]>([]);
  const [images, setImages] = useState<HetznerImage[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      try {
        const { data, error } = await getHetznerLocations(projectId);
        if (error) {
          throw new Error(error);
        }
        setLocations(data);
        form.setValue(
          "location",
          data.length > 0
            ? data.find((loc) => loc.name === "fsn1")?.name ||
              data[0].name
              : "",
          );
      } catch (err) {
        setError("Failed to get locations: " + getErrorMessage(err));
        toast.error("Failed to fetch locations", {
          description: getErrorMessage(err),
        });
      }

      try {
        const { data, error } = await getServerTypes(projectId);
        if (error) {
          throw new Error(error);
        }
        setServerTypes(data);
        form.setValue(
          "serverType",
          data.length > 0
            ? data.find((st) => st.name === "cx22")?.id.toString() ||
              data[0].id.toString()
            : "",
        );
      } catch (err) {
        setError("Failed to get server types: " + getErrorMessage(err));
        toast.error("Failed to fetch server types", {
          description: getErrorMessage(err),
        });
      }

      try {
        const { data, error } = await getHetznerImages(projectId);
        if (error) {
          throw new Error(error);
        }
        setImages(data);
        form.setValue(
          "image",
          data.length > 0
            ? data.find((img) => img.name === "ubuntu-24.04")?.id.toString() ||
              data[0].id.toString()
            : "",
        );
      } catch (err) {
        setError("Failed to get images: " + getErrorMessage(err));
        toast.error("Failed to fetch images", {
          description: getErrorMessage(err),
        });
      }

      setLoading(false);
    }

    fetch();
  }, []);

  const form = useForm<AddHetznerServerSchemaType>({
    resolver: zodResolver(AddHetznerServerSchema),
  });

  async function onSubmit(values: AddHetznerServerSchemaType) {
    try {
      const { error } = await createHetznerServer(projectId, values);
      if (error) {
        throw new Error(error);
      }

      toast.success("Hetzner server successfully created");
      if (callback) {
        callback();
      }
    } catch (error) {
      toast.error("Failed to create Hetzner server", {
        description: getErrorMessage(error),
      });
    }
  }

  if (loading) {
    return <span className="text-muted-foreground">Loading...</span>;
  }

  if (error) {
    return <span>{error}</span>;
  }

  const selectedServerType = serverTypes.find(
    (type) => type.id.toString() === form.watch("serverType"),
  );

  const selectedLocation = locations.find(
    (location) => location.name === form.watch("location"),
  );

  const selectedImage = images.find(
    (image) => image.id.toString() === form.watch("image"),
  );

  const pricing =
    selectedServerType?.prices.find(
      (price) => price.location === selectedLocation?.name,
    ) || selectedServerType?.prices.find((price) => price.location === "fsn1");

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="gap-4 grid sm:grid-cols-2 sm:gap-8"
      >
        <div className="flex flex-col gap-4">
          <FormElement
            name={"name"}
            label="Server Name"
            placeholder="Enter server name"
            isRequired
          />

          <FormElement
            name={"serverType"}
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
              <span className="truncate">
                {selectedServerType?.cores || "-"}
              </span>
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
                {selectedServerType?.disk
                  ? `${selectedServerType.disk} GB`
                  : "-"}
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
            name={"image"}
            label="Image"
            placeholder="Select image"
            type="select"
            className="w-64"
            options={images.map((image) => ({
              value: image.id.toString(),
              label: image.name || image.os_flavor,
            }))}
            isRequired
          />

          {/* Image Info */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex flex-col">
              <span className="font-semibold">Description</span>
              <span className="truncate">
                {selectedImage?.description || "-"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">OS Version</span>
              <span className="truncate">
                {selectedImage?.os_version || "-"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Image Size</span>
              <span className="truncate">
                {selectedImage?.disk_size
                  ? `${selectedImage.disk_size} GB`
                  : "-"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Disk Size</span>
              <span className="truncate">
                {selectedImage?.image_size
                  ? `${selectedImage.image_size} GB`
                  : "-"}
              </span>
            </div>
          </div>

          <FormElement
            name={"location"}
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
        </div>
        <div className="flex flex-col gap-4">
          <FormElement
            name={"dediLogin"}
            label="Trackmania Server Login"
            placeholder="Enter server login"
            isRequired
          />

          <FormElement
            name={"dediPassword"}
            label="Trackmania Server Password"
            placeholder="Enter server password"
            type="password"
            isRequired
          />

          <FormElement
            name={"roomPassword"}
            label="Room Password"
            placeholder="Enter room password"
          />

          <FormElement
            name={"superAdminPassword"}
            label="Super Admin Password"
            placeholder="Enter super admin password"
            type="password"
          />

          <FormElement
            name={"adminPassword"}
            label="Admin Password"
            placeholder="Enter admin password"
            type="password"
          />

          <FormElement
            name={"userPassword"}
            label="User Password"
            placeholder="Enter user password"
            type="password"
          />

          <FormElement
            name={"filemanagerPassword"}
            label="File Manager Password"
            placeholder="Enter file manager password"
            type="password"
            description="This password will be used to access the file manager."
          />

          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            Add Server
          </Button>
        </div>
      </form>
    </Form>
  );
}
