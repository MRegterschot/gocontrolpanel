"use client";
import { SelectItem } from "@/components/ui/select";
import { tables } from "@/lib/server-manager";
import { useTable } from "spacetimedb/react";

// Select items for the shared configs of a competition and all competitions above it.
export default function SharedConfigItems({ competitionId }: { competitionId: number }) {
  const [configs] = useTable(tables.competitionSharedConfigs({ competitionId }));
  const [[competition]] = useTable(tables.competition({ competitionId }));

  return (
    <>
      {configs.map((c) => (
        <SelectItem key={c.id} value={c.id.toString()}>
          {c.name || `Config ${c.id}`} · {competition?.name}
        </SelectItem>
      ))}
      {competition && competition.parentId !== 0 && <SharedConfigItems competitionId={competition.parentId} />}
    </>
  );
}
