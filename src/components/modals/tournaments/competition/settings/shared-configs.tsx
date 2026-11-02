"use client";
import { tables } from "@/lib/server-manager";
import { RawServerConfigV2 } from "@/lib/server-manager/types";
import { ReactNode } from "react";
import { useTable } from "spacetimedb/react";

export type SharedConfig = RawServerConfigV2 & { competitionName?: string };

// Collects the shared configs of a competition and all competitions above it.
export default function SharedConfigs({ competitionId, children }: {
  competitionId: number;
  children: (configs: SharedConfig[]) => ReactNode;
}) {
  // The client cache merges the rows of a view for all args, so they are filtered by competition.
  const [configs] = useTable(tables.competitionSharedConfigs({ competitionId }));
  const [competitions] = useTable(tables.competition({ competitionId }));
  const competition = competitions.find((c) => c.id === competitionId);
  const own = configs.filter((c) => c.competitionId === competitionId).map((c) => ({ ...c, competitionName: competition?.name }));

  if (!competition || competition.parentId === 0) return children(own);
  return (
    <SharedConfigs competitionId={competition.parentId}>
      {(above) => children([...own, ...above])}
    </SharedConfigs>
  );
}
