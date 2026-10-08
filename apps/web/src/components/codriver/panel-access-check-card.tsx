"use client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCodriverAccessCheck } from "@/hooks/use-codriver";
import { useQueryErrorToast } from "@/hooks/use-query-error-toast";
import { useSearchUsers } from "@/hooks/use-search-users";
import { getServersMinimal } from "@/lib/api-client/database";
import { queryKeys, unwrap } from "@/lib/api-client/query";
import { getErrorMessage } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export default function PanelAccessCheckCard() {
  const [serverId, setServerId] = useState("");
  const [login, setLogin] = useState("");

  const serversQuery = useQuery({
    queryKey: queryKeys.serversMinimal,
    queryFn: () => unwrap(getServersMinimal(), "GetServersMinimalError"),
  });
  useQueryErrorToast(serversQuery.error, "Failed to fetch servers");
  const { search, searchResults, searching } = useSearchUsers({
    field: "login",
  });
  const check = useCodriverAccessCheck(serverId, login);
  const result = check.data;

  return (
    <Card className="gap-6 py-6">
      <CardHeader>
        <CardTitle>Check access</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          See what Codriver would do for a player on a server.
        </p>
        <div className="flex flex-wrap gap-4">
          <div className="flex w-full max-w-72 flex-col gap-2">
            <Label>Server</Label>
            <Select value={serverId} onValueChange={setServerId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a server" />
              </SelectTrigger>
              <SelectContent>
                {(serversQuery.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-full max-w-72 flex-col gap-2">
            <Label>User</Label>
            <SearchInput
              value={login}
              onValueChange={setLogin}
              onSearch={search}
              loading={searching}
              placeholder="Search by login or nickname..."
              searchResults={searchResults.map((u) => ({
                label: u.nickName,
                value: u.login,
              }))}
            />
          </div>
        </div>

        {serverId && login && check.isPending && (
          <span className="text-sm text-muted-foreground">Checking...</span>
        )}
        {check.error && (
          <span className="text-sm text-destructive">
            Failed to check access: {getErrorMessage(check.error)}
          </span>
        )}
        {result && (
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={result.allowed ? "default" : "destructive"}>
                {result.allowed ? "Allowed" : "Refused"}
              </Badge>
              {result.layer && (
                <span className="text-muted-foreground">
                  Layer: {result.layer}
                </span>
              )}
            </div>
            {result.reason && <p>{result.reason}</p>}
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
              <dt className="text-muted-foreground">Player role</dt>
              <dd className="capitalize">{result.role}</dd>
              <dt className="text-muted-foreground">Key source</dt>
              <dd>{result.keySource ?? "—"}</dd>
              <dt className="text-muted-foreground">Models</dt>
              <dd>
                {result.primaryModel
                  ? result.primaryModel +
                    (result.escalationModel
                      ? ` (escalates to ${result.escalationModel})`
                      : "")
                  : "—"}
              </dd>
            </dl>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
