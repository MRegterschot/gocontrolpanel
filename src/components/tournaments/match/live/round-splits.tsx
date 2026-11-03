"use client";

import { PlayerAction } from "@/lib/server-manager/types";
import { formatTime } from "@/lib/utils";

type Split = { label: string; time: number; speed?: number; muted?: boolean };

// The start line holds the server time, every other action the race time.
export default function RoundSplits({ actions }: { actions: readonly PlayerAction[] }) {
  let checkpoint = 0;
  const rows = actions.flatMap((action): Split[] => {
    switch (action.tag) {
      case "Checkpoint":
        return [{ label: `CP ${++checkpoint}`, time: action.value.time, speed: action.value.speed }];
      case "Lap":
        return [{ label: "Lap", time: action.value.time, speed: action.value.speed }];
      case "Finish":
        return [{ label: "Finish", time: action.value.time, speed: action.value.speed }];
      case "Respawn":
        return [{ label: "Respawn", time: action.value.time, speed: action.value.speed, muted: true }];
      case "GiveUp":
        return [{ label: "Gave up", time: action.value, muted: true }];
      case "StartLine":
        return [];
    }
  });

  if (rows.length === 0) return <p className="text-xs text-muted-foreground">No checkpoints yet.</p>;

  return (
    <div className="grid grid-cols-[auto_auto_auto] gap-x-6 gap-y-0.5 text-xs w-fit">
      {rows.map((row, idx) => (
        <div key={idx} className={`contents ${row.muted ? "text-muted-foreground" : ""}`}>
          <span>{row.label}</span>
          <span className="tabular-nums">{formatTime(row.time)}</span>
          <span className="tabular-nums text-muted-foreground">{row.speed !== undefined ? `${Math.round(row.speed)} km/h` : ""}</span>
        </div>
      ))}
    </div>
  );
}
