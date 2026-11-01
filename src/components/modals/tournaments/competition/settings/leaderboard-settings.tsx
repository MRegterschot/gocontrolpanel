"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useServerAction } from "@/hooks/tournaments/use-server-action";
import { reducers } from "@/lib/server-manager";
import { LbSettingsV2, LeaderboardV2 } from "@/lib/server-manager/types";
import { IconArrowDown, IconArrowUp, IconDeviceFloppy, IconPlus, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useReducer } from "spacetimedb/react";

const PARAMS = ["Score", "Time", "Position"] as const;
const MANIPULATIONS = ["Add", "Multiply", "SubtractLhs", "SubtractRhs", "DivideLhs", "DivideRhs"] as const;

const DEFAULT_STEPS: Record<LbSettingsV2["tag"], LbSettingsV2> = {
  Merge: { tag: "Merge", value: { kind: { tag: "Rounds" }, action: { tag: "Summate" }, param: { tag: "Score" } } },
  Filter: { tag: "Filter", value: { kind: { tag: "Rounds" }, param: { tag: "Score" }, filter: { tag: "Best", value: 1 }, fallback: { tag: "Worst" } } },
  Remap: { tag: "Remap", value: { origin: { tag: "Score" }, target: { tag: "Score" }, manipulation: { tag: "Add" }, manipulationValue: 0 } },
  Finalize: { tag: "Finalize" },
};

// Select for the unit variants of a generated enum, it works on the tag only.
function TagSelect<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (tag: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={(tag) => onChange(tag as T)}>
        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent className="z-[9999]">
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function StepFields({ step, onChange }: { step: LbSettingsV2; onChange: (step: LbSettingsV2) => void }) {
  switch (step.tag) {
    case "Merge": {
      const set = (v: Partial<typeof step.value>) => onChange({ tag: "Merge", value: { ...step.value, ...v } });
      return (
        <>
          <TagSelect label="Action" value={step.value.action.tag} options={["Summate", "Average"]} onChange={(tag) => set({ action: { tag } })} />
          <TagSelect label="Value" value={step.value.param.tag} options={PARAMS} onChange={(tag) => set({ param: { tag } })} />
        </>
      );
    }
    case "Filter": {
      const set = (v: Partial<typeof step.value>) => onChange({ tag: "Filter", value: { ...step.value, ...v } });
      return (
        <>
          <TagSelect label="Over" value={step.value.kind.tag} options={["Rounds", "Matches"]} onChange={(tag) => set({ kind: { tag } })} />
          <TagSelect label="Value" value={step.value.param.tag} options={PARAMS} onChange={(tag) => set({ param: { tag } })} />
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Keep best</Label>
            <Input
              type="number"
              min={0}
              value={step.value.filter.value}
              onChange={(e) => set({ filter: { tag: "Best", value: Math.max(0, Math.min(65535, Number(e.target.value) || 0)) } })}
            />
          </div>
        </>
      );
    }
    case "Remap": {
      const set = (v: Partial<typeof step.value>) => onChange({ tag: "Remap", value: { ...step.value, ...v } });
      return (
        <>
          <TagSelect label="From" value={step.value.origin.tag} options={PARAMS} onChange={(tag) => set({ origin: { tag } })} />
          <TagSelect label="To" value={step.value.target.tag} options={PARAMS} onChange={(tag) => set({ target: { tag } })} />
          <TagSelect label="Operation" value={step.value.manipulation.tag} options={MANIPULATIONS} onChange={(tag) => set({ manipulation: { tag } })} />
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">By</Label>
            <Input
              type="number"
              value={step.value.manipulationValue}
              onChange={(e) => set({ manipulationValue: Math.trunc(Number(e.target.value) || 0) })}
            />
          </div>
        </>
      );
    }
    case "Finalize":
      return <p className="text-sm text-muted-foreground self-center">Turns the values into the final ranking.</p>;
  }
}

export default function LeaderboardSettings({ leaderboard }: { leaderboard: LeaderboardV2 }) {
  const [steps, setSteps] = useState(leaderboard.settings);
  const update = useServerAction(useReducer(reducers.leaderboardSettingsUpdate), "Failed to update leaderboard", "Leaderboard updated");
  const configured = useServerAction(useReducer(reducers.leaderboardConfigured), "Failed to mark leaderboard configured", "Leaderboard configured");

  const setStep = (i: number, step: LbSettingsV2) => setSteps(steps.map((s, j) => (j === i ? step : s)));
  const move = (i: number, by: number) => {
    const next = [...steps];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    setSteps(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">Status: <span className="font-semibold">{leaderboard.status.tag}</span></p>
      <Label>Steps, applied from top to bottom</Label>

      {steps.map((step, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-md border p-2">
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground w-5">{i + 1}.</span>
            <Select value={step.tag} onValueChange={(tag) => setStep(i, DEFAULT_STEPS[tag as LbSettingsV2["tag"]])}>
              <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
              <SelectContent className="z-[9999]">
                {Object.keys(DEFAULT_STEPS).map((tag) => <SelectItem key={tag} value={tag}>{tag}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" disabled={i === 0} onClick={() => move(i, -1)}><IconArrowUp /></Button>
            <Button variant="ghost" size="icon" disabled={i === steps.length - 1} onClick={() => move(i, 1)}><IconArrowDown /></Button>
            <Button variant="ghost" size="icon" onClick={() => setSteps(steps.filter((_, j) => j !== i))}><IconTrash /></Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StepFields step={step} onChange={(s) => setStep(i, s)} />
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setSteps([...steps, DEFAULT_STEPS.Merge])}>
          <IconPlus />
          Add Step
        </Button>
        <Button onClick={() => update({ id: leaderboard.id, settings: steps })}>
          <IconDeviceFloppy />
          Save Steps
        </Button>
        {leaderboard.status.tag === "Configuring" && (
          <Button variant="outline" onClick={() => configured({ id: leaderboard.id })}>Mark Configured</Button>
        )}
      </div>
    </div>
  );
}
