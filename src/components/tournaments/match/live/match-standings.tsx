"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useServerAction } from "@/hooks/tournaments/use-server-action";
import { useSpacetimeProcedure } from "@/hooks/tournaments/use-spacetime-procedure";
import { hasPermission, OWNER } from "@/lib/competition-permissions";
import { procedures, tables } from "@/lib/server-manager";
import { LbEntry, MatchV1, NodeHandle } from "@/lib/server-manager/types";
import { formatTime } from "@/lib/utils";
import { useUsers } from "@/providers/users-provider";
import { IconDownload, IconRefresh } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { useProcedure, useTable } from "spacetimedb/react";
import { useMyPermissions } from "../../competitions/permissions/use-competition-access";
import EditEntry from "./edit-entry";

const TOTAL = "total";
const LIVE = ["Live", "LiveComitted"];
// Scores and times that were never set are sent as i32::MIN.
const UNSET = -2147483648;

function ReplayButton({ match, round }: { match: MatchV1; round: number }) {
  const fetchReplay = useProcedure(procedures.matchRoundReplay);
  const download = useServerAction(
    useCallback(async () => {
      const result = await fetchReplay({ matchId: match.id, round });
      if ("ok" in result) {
        const url = URL.createObjectURL(new Blob([new Uint8Array(result.ok)]));
        const link = Object.assign(document.createElement("a"), { href: url, download: `${match.name} round ${round}.Replay.Gbx` });
        link.click();
        URL.revokeObjectURL(url);
      }
      return result;
    }, [fetchReplay, match.id, match.name, round]),
    "Failed to download replay",
  );

  return (
    <Button variant="outline" size="sm" onClick={() => download()}>
      <IconDownload />
      Replay
    </Button>
  );
}

// Procedures are not live, so the standings are fetched again whenever the match state changes,
// every few seconds while the match is live, and on request.
function useRefreshKey(match: MatchV1) {
  const [states] = useTable(tables.matchState({ matchId: match.id }));
  const state = states.find((s) => s.matchId === match.id);
  const [tick, setTick] = useState(0);
  const live = LIVE.includes(match.status.tag);

  useEffect(() => {
    if (!live) return;
    const interval = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(interval);
  }, [live]);

  return { key: [state, match.status.tag, tick], refresh: () => setTick((t) => t + 1) };
}

export default function MatchStandings({ match }: { match: MatchV1 }) {
  const users = useUsers();
  const canEdit = hasPermission(useMyPermissions(match.parentId), OWNER);
  const { key, refresh } = useRefreshKey(match);
  const node = NodeHandle.MatchV1(match.id);
  const totals = useSpacetimeProcedure(useProcedure(procedures.nodeLeaderboardOutput), { node }, key);
  const rounds = useSpacetimeProcedure(useProcedure(procedures.nodeLeaderboardOutputRaw), { node }, key);
  const [view, setView] = useState(TOTAL);

  const ok = (data: typeof totals.data): LbEntry[] => (data && "ok" in data ? data.ok : []);
  const entries = ok(rounds.data);
  const roundNumbers = [...new Set(entries.map((e) => e.round))].sort((a, b) => a - b);
  const round = view === TOTAL ? null : Number(view);
  const name = (userId: number) => users.get(userId)?.name ?? `User ${userId}`;
  const score = (e: LbEntry) => (e.score === UNSET ? "-" : e.score);

  const shown = round === null
    ? ok(totals.data)
    // Players without a position yet are listed last, by time.
    : entries
      .filter((e) => e.round === round)
      .sort((a, b) => (a.position || Infinity) - (b.position || Infinity) || (a.time > 0 ? a.time : Infinity) - (b.time > 0 ? b.time : Infinity));
  const sorted = round === null ? [...shown].sort((a, b) => a.position - b.position) : shown;
  const hasTimes = sorted.some((e) => e.time > 0);
  const error = [totals.data, rounds.data].find((d) => d && "err" in d);

  return (
    <Card className="gap-3 px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Standings</h2>
        <div className="flex items-center gap-2">
          {round !== null && <ReplayButton match={match} round={round} />}
          <Select value={view} onValueChange={setView}>
            <SelectTrigger size="sm" className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TOTAL}>Total</SelectItem>
              {roundNumbers.map((r) => <SelectItem key={r} value={r.toString()}>Round {r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="size-8" title="Refresh" onClick={refresh}>
            <IconRefresh />
          </Button>
        </div>
      </div>

      {error && "err" in error ? (
        <p className="text-sm text-destructive">{error.err}</p>
      ) : !totals.data && totals.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">No results yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Player</TableHead>
              {hasTimes && <TableHead className="text-right">Time</TableHead>}
              <TableHead className="text-right">Points</TableHead>
              {canEdit && round !== null && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((e) => (
              <TableRow key={`${e.userId}-${e.round}`}>
                <TableCell className="tabular-nums text-muted-foreground">{e.position || "-"}</TableCell>
                <TableCell className="font-medium">{name(e.userId)}</TableCell>
                {hasTimes && <TableCell className="text-right tabular-nums">{formatTime(e.time)}</TableCell>}
                <TableCell className="text-right tabular-nums font-semibold">{score(e)}</TableCell>
                {canEdit && round !== null && (
                  <TableCell>
                    <EditEntry
                      matchId={match.id}
                      userId={e.userId}
                      round={e.round}
                      points={e.score === UNSET ? 0 : e.score}
                      position={e.position}
                      onSaved={refresh}
                    />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
