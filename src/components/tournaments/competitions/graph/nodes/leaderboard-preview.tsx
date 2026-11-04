"use client";

import { useSpacetimeProcedure } from "@/hooks/tournaments/use-spacetime-procedure";
import { procedures } from "@/lib/server-manager";
import { NodeHandle } from "@/lib/server-manager/types";
import { useUsers } from "@/providers/users-provider";
import { useProcedure } from "spacetimedb/react";

// Mounted only while the popover is open, so closed nodes stay cheap.
export default function LeaderboardPreview({ id }: { id: number }) {
  const leaderboardOutput = useProcedure(procedures.nodeLeaderboardOutput);
  const { data, isLoading } = useSpacetimeProcedure(leaderboardOutput, {
    node: NodeHandle.LeaderboardV1(id),
  });
  const users = useUsers();

  if (isLoading) return <p className="text-muted-foreground">Loading...</p>;
  if (!data || "err" in data) return <p className="text-destructive">{data?.err ?? "Failed"}</p>;
  if (data.ok.length === 0) return <p className="text-muted-foreground">No entries yet.</p>;

  return data.ok.map((entry) => (
    <div key={entry.userId}>
      {entry.position}. {users.get(entry.userId)?.name ?? entry.userId}, {entry.score}
    </div>
  ));
}
