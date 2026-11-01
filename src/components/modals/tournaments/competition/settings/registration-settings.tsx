"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useServerAction } from "@/hooks/tournaments/use-server-action";
import { reducers } from "@/lib/server-manager";
import { Registration, RegistrationStatus } from "@/lib/server-manager/types";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useState } from "react";
import { useReducer } from "spacetimedb/react";

type Status = RegistrationStatus["tag"];

export default function RegistrationSettings({ registration }: { registration: Registration }) {
  const { id, status: { tag: status } } = registration;
  const [playerLimit, setPlayerLimit] = useState(registration.settings.value.playerLimit);

  const update = useServerAction(useReducer(reducers.registrationSettingsUpdate), "Failed to update registration", "Registration updated");
  const configured = useServerAction(useReducer(reducers.registrationConfigured), "Failed to mark registration configured", "Registration configured");
  const open = useServerAction(useReducer(reducers.registrationStart), "Failed to open registration", "Registration opened");
  const close = useServerAction(useReducer(reducers.registrationEnd), "Failed to close registration", "Registration closed");

  // Each action is only shown in the state the server accepts it in.
  const actions: { label: string; when: Status; run: () => unknown }[] = [
    { label: "Mark Configured", when: "Configuring", run: () => configured({ id }) },
    { label: "Open", when: "Configured", run: () => open({ id }) },
    { label: "Close", when: "Ongoing", run: () => close({ id }) },
  ];
  const editable = status === "Configuring" || status === "Configured";

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">Status: <span className="font-semibold">{status}</span></p>

      <div className="flex flex-col gap-2">
        <Label htmlFor="player-limit">Player limit</Label>
        <div className="flex gap-2">
          <Input
            id="player-limit"
            type="number"
            min={0}
            disabled={!editable}
            value={playerLimit}
            onChange={(e) => setPlayerLimit(Math.max(0, Number(e.target.value) || 0))}
          />
          <Button
            disabled={!editable || playerLimit === registration.settings.value.playerLimit}
            onClick={() => update({ id, settings: { tag: "Player", value: { playerLimit } } })}
          >
            <IconDeviceFloppy />
            Save
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {actions.filter((a) => a.when === status).map((a) => (
          <Button key={a.label} variant="outline" onClick={a.run}>{a.label}</Button>
        ))}
      </div>
    </div>
  );
}
