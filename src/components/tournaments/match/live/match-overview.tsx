"use client";

import { tables } from "@/lib/server-manager";
import { useTable } from "spacetimedb/react";
import MatchChat from "./match-chat";
import MatchHeader from "./match-header";
import MatchStandings from "./match-standings";

// Shared by the match page and the match dialog, the dialog leaves out the link back to the competition.
export default function MatchOverview({ matchId, embedded }: { matchId: number; embedded?: boolean }) {
  const [matches, ready] = useTable(tables.matchById({ matchId }));
  const match = matches.find((m) => m.id === matchId);

  if (!ready) return <div className="p-6 text-muted-foreground">Loading match...</div>;
  if (!match) return <div>Match not found</div>;

  return (
    <div className="flex flex-col gap-4">
      <MatchHeader match={match} embedded={embedded} />
      <div className="grid gap-4 lg:grid-cols-3 items-start">
        <div className="lg:col-span-2">
          <MatchStandings match={match} />
        </div>
        <MatchChat match={match} />
      </div>
    </div>
  );
}
