"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useServerAction } from "@/hooks/tournaments/use-server-action";
import { reducers } from "@/lib/server-manager";
import { IconPencil } from "@tabler/icons-react";
import { useState } from "react";
import { useReducer } from "spacetimedb/react";

// Manual corrections of a round result, the server only allows them for owners.
export default function EditEntry({ matchId, userId, round, points, position, onSaved }: {
  matchId: number;
  userId: number;
  round: number;
  points: number;
  position: number;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ points, position });
  const setScore = useServerAction(useReducer(reducers.matchRoundPlayerSetScoreManual), "Failed to set points");
  const setPosition = useServerAction(useReducer(reducers.matchRoundPlayerSetPositionManual), "Failed to set position");

  const save = async () => {
    const ok = await Promise.all([
      draft.points === points || setScore({ matchId, userId, round, score: draft.points }),
      draft.position === position || setPosition({ matchId, userId, round, position: draft.position }),
    ]);
    if (ok.every(Boolean)) {
      setOpen(false);
      onSaved();
    }
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setDraft({ points, position }); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7">
          <IconPencil className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="entry-points">Points</Label>
          <Input id="entry-points" type="number" value={draft.points} onChange={(e) => setDraft((d) => ({ ...d, points: Number(e.target.value) }))} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="entry-position">Position</Label>
          <Input id="entry-position" type="number" min={0} value={draft.position} onChange={(e) => setDraft((d) => ({ ...d, position: Number(e.target.value) }))} />
        </div>
        <Button size="sm" disabled={draft.points === points && draft.position === position} onClick={save}>Save</Button>
      </PopoverContent>
    </Popover>
  );
}
