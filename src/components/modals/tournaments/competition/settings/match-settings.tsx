"use client";
import MatchStatusBadge from "@/components/tournaments/match/match-status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useServerAction } from "@/hooks/tournaments/use-server-action";
import { reducers } from "@/lib/server-manager";
import { MatchStatus, MatchV1 } from "@/lib/server-manager/types";
import { useReducer } from "spacetimedb/react";

type Status = MatchStatus["tag"];
const BEFORE_LIVE: Status[] = ["Configuring", "Configured", "Preparation"];

export default function MatchSettings({ match }: { match: MatchV1 }) {
  const { id: matchId, status: { tag: status } } = match;

  const setOpen = useServerAction(useReducer(reducers.matchOpen), "Failed to update match");
  const configured = useServerAction(useReducer(reducers.matchConfigured), "Failed to mark match configured", "Match configured");
  const prepare = useServerAction(useReducer(reducers.matchSetPreparation), "Failed to prepare match", "Match in preparation");
  const start = useServerAction(useReducer(reducers.matchTryStart), "Failed to start match", "Match started");
  const restart = useServerAction(useReducer(reducers.matchRestart), "Failed to restart match", "Match restarted");
  const recovery = useServerAction(useReducer(reducers.matchManualRecovery), "Failed to enter recovery", "Match in recovery");
  const end = useServerAction(useReducer(reducers.matchEnd), "Failed to end match", "Match ended");

  // Each action is only shown in the states the server accepts it in.
  const actions: { label: string; when: Status[]; run: () => unknown }[] = [
    { label: "Mark Configured", when: ["Configuring"], run: () => configured({ id: matchId }) },
    { label: "Prepare", when: ["Configured"], run: () => prepare({ matchId }) },
    { label: "Start", when: ["Preparation"], run: () => start({ matchId }) },
    { label: "Restart", when: ["Preparation", "Live", "LiveComitted", "Recovery"], run: () => restart({ matchId }) },
    { label: "Enter Recovery", when: ["Live", "LiveComitted"], run: () => recovery({ id: matchId }) },
    { label: "End", when: ["Preparation", "Live", "LiveComitted", "Recovery", "RecoveryPreparation"], run: () => end({ matchId }) },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Label>Status</Label>
        <MatchStatusBadge status={match.status} />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="match-open"
          checked={match.open}
          disabled={!BEFORE_LIVE.includes(status)}
          onCheckedChange={(open) => setOpen({ matchId, open: open === true })}
        />
        <Label htmlFor="match-open">Open for everyone to join</Label>
      </div>

      <div className="flex flex-wrap gap-2">
        {actions.filter((a) => a.when.includes(status)).map((a) => (
          <Button key={a.label} variant={a.label === "End" ? "destructive" : "outline"} onClick={a.run}>
            {a.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
