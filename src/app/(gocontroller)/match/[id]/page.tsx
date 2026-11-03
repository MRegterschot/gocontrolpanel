"use client";
import MatchChat from "@/components/tournaments/match/live/match-chat";
import MatchHeader from "@/components/tournaments/match/live/match-header";
import MatchStandings from "@/components/tournaments/match/live/match-standings";
import { tables } from "@/lib/server-manager";
import React from "react";
import { useTable } from "spacetimedb/react";

export default function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const matchId = Number(React.use(params).id);
  const [matches, ready] = useTable(tables.matchById({ matchId }));
  const match = matches.find((m) => m.id === matchId);

  if (!ready) return <div className="p-6 text-muted-foreground">Loading match...</div>;
  if (!match) return <div>Match not found</div>;

  return (
    <div className="flex flex-col gap-4">
      <MatchHeader match={match} />
      <div className="grid gap-4 lg:grid-cols-3 items-start">
        <div className="lg:col-span-2">
          <MatchStandings match={match} />
        </div>
        <MatchChat match={match} />
      </div>
    </div>
  );
}
