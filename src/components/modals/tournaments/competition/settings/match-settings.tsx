"use client";
import Modal from "@/components/modals/modal";
import { DefaultModalProps } from "@/components/modals/default-props";
import MatchStatusBadge from "@/components/tournaments/match/match-status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfigForm from "@/forms/tournaments/config/config-form";
import { ConfigFormSchemaType } from "@/forms/tournaments/config/config-schema";
import { useServerAction } from "@/hooks/tournaments/use-server-action";
import { isNode } from "@/lib/node-handle";
import { reducers, tables } from "@/lib/server-manager";
import { MatchStatus, MatchV1, NodeHandle, ServerConfigV2 } from "@/lib/server-manager/types";
import { IconPencil, IconX } from "@tabler/icons-react";
import { useReducer, useTable } from "spacetimedb/react";
import SharedConfigs, { SharedConfig } from "./shared-configs";

type Status = MatchStatus["tag"];
const BEFORE_LIVE: Status[] = ["Configuring", "Configured", "Preparation"];
const BEFORE_PREPARATION: Status[] = ["Configuring", "Configured"];
const SERVER_CHANGEABLE: Status[] = ["Configuring", "Configured", "Recovery"];

// Inline configs belong to the match alone, so they can only be filled in fresh or from a shared one.
function InlineConfigModal({ data, closeModal }: DefaultModalProps<{
  title: string;
  config?: ServerConfigV2;
  onSubmit: (config: ServerConfigV2) => Promise<boolean>;
}>) {
  if (!data) return null;

  return (
    <Card onClick={(e) => e.stopPropagation()} className="p-6 gap-4 sm:max-w-5xl max-sm:w-full max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{data.title}</h1>
        <IconX className="h-6 w-6 cursor-pointer text-muted-foreground" onClick={closeModal} />
      </div>
      <ConfigForm
        inline
        initial={data.config && { name: "Inline", config: data.config as ConfigFormSchemaType["config"] }}
        submitLabel="Save Inline Config"
        onSubmit={async ({ config }) => (await data.onSubmit(config)) && closeModal?.()}
      />
    </Card>
  );
}

function ConfigSelect({ label, value, configs, sharedDisabled, inlineDisabled, onShared, onInline }: {
  label: string;
  value: number;
  configs: SharedConfig[];
  sharedDisabled: boolean;
  inlineDisabled: boolean;
  onShared: (configId: number) => void;
  onInline: (config: ServerConfigV2) => Promise<boolean>;
}) {
  const shared = configs.find((c) => c.id === value);

  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-2">
        <Select value={value ? value.toString() : ""} disabled={sharedDisabled} onValueChange={(v) => onShared(Number(v))}>
          <SelectTrigger className="w-full"><SelectValue placeholder="No config" /></SelectTrigger>
          <SelectContent className="z-[9999]">
            {value !== 0 && !shared && <SelectItem value={value.toString()}>Inline config</SelectItem>}
            {configs.map((c) => (
              <SelectItem key={c.id} value={c.id.toString()}>{c.name || `Config ${c.id}`} · {c.competitionName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Modal>
          <InlineConfigModal data={{ title: `Inline ${label.toLowerCase()}`, config: shared?.config, onSubmit: onInline }} />
          <Button variant="outline" size="icon" disabled={inlineDisabled} title="Create an inline config">
            <IconPencil />
          </Button>
        </Modal>
      </div>
    </div>
  );
}

function MatchServer({ match }: { match: MatchV1 }) {
  const [servers] = useTable(tables.tabRawServer);
  const [occupations] = useTable(tables.tabRawServerOccupation);
  const [available] = useTable(tables.competitionAvailableServerPool({ competitionId: match.parentId }));
  const assign = useServerAction(useReducer(reducers.matchAssignServer), "Failed to assign server", "Server assigned");
  const revoke = useServerAction(useReducer(reducers.matchServerRevoke), "Failed to revoke server", "Server revoked");

  const serverId = occupations.find((o) => isNode(NodeHandle.MatchV1(match.id), o))?.serverId;
  const server = servers.find((s) => s.id === serverId);
  const changeable = SERVER_CHANGEABLE.includes(match.status.tag);

  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">Server</Label>
      {serverId !== undefined ? (
        <div className="flex items-center gap-2">
          <span className="flex-1 text-sm font-medium">{server?.serverLogin ?? `Server ${serverId}`}</span>
          <Button variant="ghost" size="icon" disabled={!changeable} onClick={() => revoke({ matchId: match.id })}><IconX /></Button>
        </div>
      ) : (
        <Select value="" disabled={!changeable} onValueChange={(v) => assign({ to: match.id, serverId: Number(v) })}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={match.autoProvisionServer ? "Assigned automatically on prepare" : "Select a free server"} />
          </SelectTrigger>
          <SelectContent className="z-[9999]">
            {available.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.serverLogin}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

export default function MatchSettings({ match }: { match: MatchV1 }) {
  const { id: matchId, status: { tag: status } } = match;

  const setOpen = useServerAction(useReducer(reducers.matchOpen), "Failed to update match");
  const configured = useServerAction(useReducer(reducers.matchConfigured), "Failed to mark match configured", "Match configured");
  const prepare = useServerAction(useReducer(reducers.matchSetPreparation), "Failed to prepare match", "Match in preparation");
  const start = useServerAction(useReducer(reducers.matchTryStart), "Failed to start match", "Match started");
  const restart = useServerAction(useReducer(reducers.matchRestart), "Failed to restart match", "Match restarted");
  const recovery = useServerAction(useReducer(reducers.matchManualRecovery), "Failed to enter recovery", "Match in recovery");
  const end = useServerAction(useReducer(reducers.matchEnd), "Failed to end match", "Match ended");
  const setConfig = useServerAction(useReducer(reducers.matchSharedConfig), "Failed to set config", "Config set");
  const setPreConfig = useServerAction(useReducer(reducers.matchSharedPreConfig), "Failed to set preparation config", "Preparation config set");
  const overrideConfig = useServerAction(useReducer(reducers.matchOverrideConfig), "Failed to save inline config", "Inline config saved");
  const overridePreConfig = useServerAction(useReducer(reducers.matchOverridePreConfig), "Failed to save inline preparation config", "Inline preparation config saved");

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

      <SharedConfigs competitionId={match.parentId}>
        {(configs) => (
          <div className="grid grid-cols-2 gap-2">
            <ConfigSelect
              label="Preparation config"
              value={match.preConfig}
              configs={configs}
              sharedDisabled={!BEFORE_LIVE.includes(status)}
              inlineDisabled={!BEFORE_PREPARATION.includes(status)}
              onShared={(configId) => setPreConfig({ matchId, configId })}
              onInline={(config) => overridePreConfig({ id: matchId, config })}
            />
            <ConfigSelect
              label="Match config"
              value={match.config}
              configs={configs}
              sharedDisabled={!BEFORE_LIVE.includes(status)}
              inlineDisabled={!BEFORE_PREPARATION.includes(status)}
              onShared={(configId) => setConfig({ matchId, configId })}
              onInline={(config) => overrideConfig({ id: matchId, config })}
            />
          </div>
        )}
      </SharedConfigs>
      <MatchServer match={match} />

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
