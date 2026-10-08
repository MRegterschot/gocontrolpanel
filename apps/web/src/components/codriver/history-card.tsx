"use client";

import { PaginationTable } from "@/components/table/pagination-table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { codriverRequestsPath } from "@/lib/api-client/codriver";
import { codriverStatuses } from "@/types/codriver";
import { useId, useState } from "react";
import { createServerRequestColumns } from "./server-requests-columns";

export default function CodriverHistoryCard({
  serverId,
}: {
  serverId?: string;
}) {
  const id = useId();
  const [status, setStatus] = useState("all");
  const [login, setLogin] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  return (
    <Card className="gap-6 py-6">
      <CardHeader>
        <CardTitle>Request history</CardTitle>
        <CardDescription>
          Filter by status or player login. Search also matches request text.
          Exported evaluation drafts need review before adding them to the
          dataset.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setFilters({
              ...(status !== "all" ? { status } : {}),
              ...(login.trim() ? { login: login.trim() } : {}),
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor={`${id}-status`}>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id={`${id}-status`} className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {codriverStatuses.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-player`}>Player login</Label>
            <Input
              id={`${id}-player`}
              value={login}
              maxLength={100}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Any player"
            />
          </div>
          <Button variant="outline" type="submit">
            Apply filters
          </Button>
          <Button
            variant="ghost"
            type="button"
            onClick={() => {
              setStatus("all");
              setLogin("");
              setFilters({});
            }}
          >
            Clear filters
          </Button>
        </form>
        <PaginationTable
          key={JSON.stringify(filters)}
          createColumns={createServerRequestColumns}
          endpoint={codriverRequestsPath(serverId)}
          queryFilters={filters}
          args={{ showServer: !serverId }}
          filter
          actions={(refetch) => (
            <Button variant="outline" onClick={refetch}>
              Refresh history
            </Button>
          )}
        />
      </CardContent>
    </Card>
  );
}
