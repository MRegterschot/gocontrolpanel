"use client";
import MatchOverview from "@/components/tournaments/match/live/match-overview";
import React from "react";

export default function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  return <MatchOverview matchId={Number(React.use(params).id)} />;
}
