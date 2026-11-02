"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import ConfigDetails from "@/forms/tournaments/config/config-details";
import { ConfigFormSchemaType } from "@/forms/tournaments/config/config-schema";
import { cn } from "@/lib/utils";
import { useRef, useState } from "react";
import { useMatchConfig } from "../graph-context";
import { NodeRow } from "./node-card";

export default function MatchConfigField({ label, configId }: { label: string; configId: number }) {
  const raw = useMatchConfig(configId);
  const config = raw?.config as ConfigFormSchemaType["config"] | undefined;
  const name = !raw ? "None" : raw.competitionId === 0 ? "Inline" : raw.name || `Config ${raw.id}`;

  const [peek, setPeek] = useState(false);
  const [open, setOpen] = useState(false);
  const closeTimeout = useRef<NodeJS.Timeout | null>(null);
  const show = () => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    setPeek(true);
  };
  const hide = () => {
    closeTimeout.current = setTimeout(() => setPeek(false), 200);
  };

  return (
    <>
      <Popover open={peek && !!config && !open}>
        <PopoverAnchor asChild>
          <button
            type="button"
            disabled={!config}
            className={cn(
              "nodrag flex min-w-0 flex-1 flex-col rounded-md border px-2 py-1 text-left",
              config ? "cursor-pointer hover:bg-accent" : "text-muted-foreground",
            )}
            onMouseEnter={show}
            onMouseLeave={hide}
            onClick={() => setOpen(true)}
          >
            <span className="text-muted-foreground">{label}</span>
            <span className="truncate font-medium">{name}</span>
          </button>
        </PopoverAnchor>
        {config && (
          <PopoverContent side="top" className="w-56 text-xs flex flex-col gap-1" onMouseEnter={show} onMouseLeave={hide}>
            <p className="font-semibold">{name}</p>
            <NodeRow label="Mode">{config.mode.tag}</NodeRow>
            <NodeRow label="Maps">{config.maps.mapUids.length}</NodeRow>
            <NodeRow label="Warmup">
              {config.common.warmupDuration.tag === "Seconds" ? `${config.common.warmupDuration.value}s` : config.common.warmupDuration.tag}
            </NodeRow>
            <NodeRow label="Chat time">{config.common.chatTime}</NodeRow>
            <p className="text-muted-foreground">Click for details</p>
          </PopoverContent>
        )}
      </Popover>

      {config && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto" onPointerDown={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle>{label}: {name}</DialogTitle>
              <DialogDescription>Read only, change it in the match settings.</DialogDescription>
            </DialogHeader>
            <ConfigDetails name={raw?.competitionId === 0 ? undefined : name} config={config} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
