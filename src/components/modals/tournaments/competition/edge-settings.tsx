"use client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useServerAction } from "@/hooks/tournaments/use-server-action";
import { toNodeId } from "@/lib/node-handle";
import { reducers, tables } from "@/lib/server-manager";
import { CompetitionConnection, ConnectionAction, ConnectionDataOption } from "@/lib/server-manager/types";
import { IconCheck, IconDeviceFloppy, IconTrash, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useReducer, useTable } from "spacetimedb/react";
import { DefaultModalProps } from "../../default-props";

const ACTIONS = { MatchV1: ["TryStart", "ForceStart"], RegistrationV1: ["Open", "Close"] } as const;

const DATA_OPTIONS = {
  All: "All players",
  FirstN: "First N",
  LastN: "Last N",
  FirstOffsetN: "N after an offset",
  Custom: "Custom positions",
} as const;

type DataOptionTag = keyof typeof DATA_OPTIONS;

function defaultOption(tag: DataOptionTag): ConnectionDataOption {
  switch (tag) {
    case "All": return { tag };
    case "FirstN":
    case "LastN": return { tag, value: 1 };
    case "FirstOffsetN": return { tag, value: { offset: 0, take: 1 } };
    case "Custom": return { tag, value: new Uint8Array() };
  }
}

const toU8 = (value: string) => Math.max(0, Math.min(255, Number(value) || 0));

export default function EdgeSettingsModal({
  data: connection,
  closeModal,
}: DefaultModalProps<CompetitionConnection>) {
  const markConfigured = useServerAction(
    useReducer(reducers.connectionConfigured),
    "Failed to mark connection configured",
    "Connection configured",
  );
  const deleteConnection = useServerAction(
    useReducer(reducers.connectionDelete),
    "Failed to delete connection",
    "Connection deleted",
  );

  if (!connection) return null;
  const locked = connection.status.tag === "Resolved";

  return (
    <Card
      onClick={(e) => e.stopPropagation()}
      className="p-6 gap-4 sm:min-w-100 max-sm:w-full max-h-[90vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{connection.kind.tag} Connection</h1>
        <IconX className="h-6 w-6 cursor-pointer text-muted-foreground" onClick={closeModal} />
      </div>
      <p className="text-sm text-muted-foreground">
        {toNodeId(connection.origin)} → {toNodeId(connection.target)} · {connection.status.tag}
      </p>

      {connection.kind.tag === "Data" && <DataOptionSettings connection={connection} disabled={locked} />}
      {connection.kind.tag === "Action" && <ActionSettings connection={connection} disabled={locked} />}

      <div className="flex justify-between gap-2 mt-2">
        <Button
          variant="destructive"
          onClick={async () => {
            if (await deleteConnection({ id: connection.id })) closeModal?.();
          }}
        >
          <IconTrash />
          Delete
        </Button>
        {connection.status.tag === "Configuring" && (
          <Button onClick={() => markConfigured({ connectionId: connection.id })}>
            <IconCheck />
            Mark Configured
          </Button>
        )}
      </div>
    </Card>
  );
}

// The server has no view for the current action yet, so it can only be set.
function ActionSettings({ connection, disabled }: { connection: CompetitionConnection; disabled: boolean }) {
  const update = useServerAction(
    useReducer(reducers.connectionActionUpdate),
    "Failed to update action",
    "Action updated",
  );
  const target = connection.target.tag;
  if (target !== "MatchV1" && target !== "RegistrationV1") return null;

  return (
    <div className="flex flex-col gap-2">
      <Label>Action on target</Label>
      <Select
        disabled={disabled}
        onValueChange={(tag) =>
          update({ connectionId: connection.id, action: { tag: target, value: { tag } } as ConnectionAction })
        }
      >
        <SelectTrigger className="w-full"><SelectValue placeholder="Select action" /></SelectTrigger>
        <SelectContent className="z-[9999]">
          {ACTIONS[target].map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function DataOptionSettings({ connection, disabled }: { connection: CompetitionConnection; disabled: boolean }) {
  const [rows] = useTable(tables.competitionConnectionsData({ competitionId: connection.competitionId }));
  const current = rows.find((r) => r.connectionId === connection.id)?.options;

  return current ? <DataOptionForm connectionId={connection.id} initial={current} disabled={disabled} /> : null;
}

function DataOptionForm({
  connectionId,
  initial,
  disabled,
}: {
  connectionId: number;
  initial: ConnectionDataOption;
  disabled: boolean;
}) {
  const [option, setOption] = useState(initial);
  const update = useServerAction(
    useReducer(reducers.competitionConnectionDataUpdate),
    "Failed to update data option",
    "Data option updated",
  );

  return (
    <div className="flex flex-col gap-2">
      <Label>Players passed along</Label>
      <Select
        value={option.tag}
        disabled={disabled}
        onValueChange={(tag) => setOption(defaultOption(tag as DataOptionTag))}
      >
        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent className="z-[9999]">
          {Object.entries(DATA_OPTIONS).map(([tag, label]) => <SelectItem key={tag} value={tag}>{label}</SelectItem>)}
        </SelectContent>
      </Select>

      {(option.tag === "FirstN" || option.tag === "LastN") && (
        <Input
          type="number"
          disabled={disabled}
          value={option.value}
          onChange={(e) => setOption({ tag: option.tag, value: toU8(e.target.value) })}
        />
      )}
      {option.tag === "FirstOffsetN" && (
        <div className="flex gap-2">
          <Input
            type="number"
            disabled={disabled}
            placeholder="Offset"
            value={option.value.offset}
            onChange={(e) => setOption({ tag: "FirstOffsetN", value: { ...option.value, offset: toU8(e.target.value) } })}
          />
          <Input
            type="number"
            disabled={disabled}
            placeholder="Take"
            value={option.value.take}
            onChange={(e) => setOption({ tag: "FirstOffsetN", value: { ...option.value, take: toU8(e.target.value) } })}
          />
        </div>
      )}
      {option.tag === "Custom" && (
        <Input
          disabled={disabled}
          placeholder="Positions, e.g. 1, 4, 5"
          defaultValue={Array.from(option.value).join(", ")}
          onChange={(e) =>
            setOption({ tag: "Custom", value: Uint8Array.from(e.target.value.split(",").filter((s) => s.trim()).map(toU8)) })
          }
        />
      )}

      <Button disabled={disabled} onClick={() => update({ connectionId, option })}>
        <IconDeviceFloppy />
        Save
      </Button>
    </div>
  );
}
