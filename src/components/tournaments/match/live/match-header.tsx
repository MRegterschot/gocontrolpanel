"use client";

import MatchStatusBadge from "@/components/tournaments/match/match-status-badge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { tables } from "@/lib/server-manager";
import { MatchV1 } from "@/lib/server-manager/types";
import { formatTime } from "@/lib/utils";
import { IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import { ReactNode } from "react";
import { useTable } from "spacetimedb/react";
import { parseTmTags } from "tmtags";

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}

export default function MatchHeader({ match, embedded }: { match: MatchV1; embedded?: boolean }) {
  const [competitions] = useTable(tables.competition({ competitionId: match.parentId }));
  const [states] = useTable(tables.matchState({ matchId: match.id }));
  // Map rows carry no match id, which is fine as only this match's map is subscribed here.
  const [[map]] = useTable(tables.matchMap({ matchId: match.id }));
  const competition = competitions.find((c) => c.id === match.parentId);
  const state = states.find((s) => s.matchId === match.id);

  return (
    <div className="flex flex-col gap-3">
      {!embedded && (
        <Link href={`/competitions/${match.parentId}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit">
          <IconArrowLeft className="size-4" />
          {competition?.name ?? "Competition"}
        </Link>
      )}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{match.name}</h1>
        <MatchStatusBadge status={match.status} />
        {state?.paused && <Badge variant="destructive">Paused</Badge>}
        {state?.isWarmup && <Badge variant="secondary">Warmup</Badge>}
      </div>

      <Card className="flex-row flex-wrap gap-x-8 gap-y-3 px-4 py-3">
        {!state ? (
          <span className="text-sm text-muted-foreground">The match has not been prepared on a server yet.</span>
        ) : (
          <>
            <Stat label="Map">
              {map ? <span dangerouslySetInnerHTML={{ __html: parseTmTags(map.name) }} /> : "-"}
            </Stat>
            {map && <Stat label="Author time">{formatTime(map.authorTime)}</Stat>}
            <Stat label="Mode">{state.mode.tag}</Stat>
            <Stat label="Round">{state.round}</Stat>
            <Stat label="Warmup rounds">{state.warmup}</Stat>
            <Stat label="Restarts">{state.restarted}</Stat>
          </>
        )}
      </Card>
    </div>
  );
}
