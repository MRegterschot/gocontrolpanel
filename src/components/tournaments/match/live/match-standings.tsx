"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useServerAction } from "@/hooks/tournaments/use-server-action";
import { hasPermission, OWNER } from "@/lib/competition-permissions";
import { procedures, tables } from "@/lib/server-manager";
import { MatchV1 } from "@/lib/server-manager/types";
import { formatTime } from "@/lib/utils";
import { useUsers } from "@/providers/users-provider";
import { IconChevronDown, IconChevronRight, IconDownload } from "@tabler/icons-react";
import { Fragment, useCallback, useState } from "react";
import { useProcedure, useTable } from "spacetimedb/react";
import { useMyPermissions } from "../../competitions/permissions/use-competition-access";
import EditEntry from "./edit-entry";
import RoundSplits from "./round-splits";

const TOTAL = "total";

// Mounted only while a row is expanded, so the actions of one round are only loaded when needed.
function PlayerSplits({ matchId, round, userId }: { matchId: number; round: number; userId: number }) {
  const [rows] = useTable(tables.matchRoundPlayerActions({ matchId, round }));
  const ext = rows.find((r) => r.matchId === matchId && r.round === round && r.userId === userId);
  return <RoundSplits actions={ext?.roundActions ?? []} />;
}

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

export default function MatchStandings({ match }: { match: MatchV1 }) {
  const users = useUsers();
  const canEdit = hasPermission(useMyPermissions(match.parentId), OWNER);
  // The client cache merges the rows of a view for all args, so they are filtered by match.
  const [rows] = useTable(tables.matchRoundPlayers({ matchId: match.id }));
  const entries = rows.filter((e) => e.matchId === match.id);
  const [view, setView] = useState(TOTAL);
  const [expanded, setExpanded] = useState<number | null>(null);

  const rounds = [...new Set(entries.map((e) => e.round))].sort((a, b) => a - b);
  const round = view === TOTAL ? null : Number(view);
  const name = (userId: number) => users.get(userId)?.name ?? `User ${userId}`;

  const totals = [...Map.groupBy(entries, (e) => e.userId)]
    .map(([userId, rows]) => ({ userId, points: rows.reduce((sum, r) => sum + r.points, 0), rounds: rows.length }))
    .sort((a, b) => b.points - a.points);

  // Players without a position yet are listed last, by time.
  const roundEntries = entries
    .filter((e) => e.round === round)
    .sort((a, b) => (a.position || Infinity) - (b.position || Infinity) || (a.time || Infinity) - (b.time || Infinity));

  return (
    <Card className="gap-3 px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Standings</h2>
        <div className="flex items-center gap-2">
          {round !== null && <ReplayButton match={match} round={round} />}
          <Select value={view} onValueChange={(v) => { setView(v); setExpanded(null); }}>
            <SelectTrigger size="sm" className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TOTAL}>Total</SelectItem>
              {rounds.map((r) => <SelectItem key={r} value={r.toString()}>Round {r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No results yet.</p>
      ) : round === null ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Player</TableHead>
              <TableHead className="text-right">Rounds</TableHead>
              <TableHead className="text-right">Points</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {totals.map((t, idx) => (
              <TableRow key={t.userId}>
                <TableCell className="tabular-nums text-muted-foreground">{idx + 1}</TableCell>
                <TableCell className="font-medium">{name(t.userId)}</TableCell>
                <TableCell className="text-right tabular-nums">{t.rounds}</TableCell>
                <TableCell className="text-right tabular-nums font-semibold">{t.points}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Player</TableHead>
              <TableHead className="text-right">Time</TableHead>
              <TableHead className="text-right">Points</TableHead>
              {canEdit && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {roundEntries.map((e) => (
              <Fragment key={e.id}>
                <TableRow className="cursor-pointer" onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
                  <TableCell className="tabular-nums text-muted-foreground">{e.position || "-"}</TableCell>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-1">
                      {expanded === e.id ? <IconChevronDown className="size-4" /> : <IconChevronRight className="size-4" />}
                      {name(e.userId)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatTime(e.time)}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{e.points}</TableCell>
                  {canEdit && (
                    <TableCell>
                      <EditEntry matchId={match.id} userId={e.userId} round={e.round} points={e.points} position={e.position} />
                    </TableCell>
                  )}
                </TableRow>
                {expanded === e.id && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell />
                    <TableCell colSpan={canEdit ? 4 : 3}>
                      <PlayerSplits matchId={match.id} round={e.round} userId={e.userId} />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
