"use client";

import { DataTable } from "@/components/table/data-table";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HetznerLocation } from "@/types/api/hetzner/locations";
import { HetznerServerType } from "@/types/api/hetzner/servers";
import { useState } from "react";
import Flag from "react-world-flags";
import { createColumns } from "./server-types-columns";

interface ServerTypesPricingProps {
  serverTypes: HetznerServerType[];
  currency: string;
  locations: HetznerLocation[];
}

export default function ServerTypesPricing({
  serverTypes,
  currency,
  locations,
}: ServerTypesPricingProps) {
  const [selectedLocation, setSelectedLocation] = useState<string>(
    serverTypes.some((st) => st.prices.some((p) => p.location === "fsn1"))
      ? "fsn1"
      : serverTypes[0]?.prices[0]?.location || "",
  );

  const columns = createColumns(selectedLocation, currency);

  return (
    <Card className="p-4 gap-4">
      <div className="flex justify-between items-end">
        <div className="flex flex-col">
          <h2 className="text-lg font-bold">Servers</h2>
          <p className="text-sm text-muted-foreground">
            Overview of all available servers and their pricing.
          </p>
        </div>

        <div>
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger>
              <SelectValue placeholder="Select a location" asChild>
                <div className="flex gap-2 items-center">
                  <Flag
                    code={
                      locations.find((loc) => loc.name === selectedLocation)
                        ?.country
                    }
                    fallback={
                      locations.find((loc) => loc.name === selectedLocation)
                        ?.country
                    }
                    className="h-4 w-8"
                  />
                  {locations.find((loc) => loc.name === selectedLocation)?.city}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {Array.from(
                  new Set(
                    serverTypes.flatMap((type) =>
                      type.prices.map((price) => price.location),
                    ),
                  ),
                ).map((location) => (
                  <SelectItem
                    key={location}
                    value={location}
                    className="flex gap-2 items-center"
                  >
                    <Flag
                      code={
                        locations.find((loc) => loc.name === location)?.country
                      }
                      fallback={
                        locations.find((loc) => loc.name === location)?.country
                      }
                      className="h-4 w-8"
                    />
                    {locations.find((loc) => loc.name === location)?.city}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={serverTypes.filter((st) =>
          st.prices.some((p) => p.location === selectedLocation),
        )}
      />
    </Card>
  );
}
