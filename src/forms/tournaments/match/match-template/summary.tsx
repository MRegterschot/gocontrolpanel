"use client";

import BooleanDisplay from "@/components/boolean-display";
import { Button } from "@/components/ui/button";
import { reducers } from "@/lib/tourney-manager";
import { getErrorMessage } from "@/lib/utils";
import { IconArrowNarrowLeft, IconPlus } from "@tabler/icons-react";
import { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { useReducer } from "spacetimedb/react";
import { CreateMatchTemplateSchemaType } from "./create-match-template-schema";
import MatchTemplateRoundsSummary from "./modes/rounds-summary";

export default function MatchTemplateSummary({
  form,
  onBack,
  callback,
}: {
  form: UseFormReturn<CreateMatchTemplateSchemaType>;
  onBack: () => void;
  callback?: () => void;
}) {
  const createMatchTemplate = useReducer(reducers.createMatchTemplate);

  async function onSubmit(values: CreateMatchTemplateSchemaType) {
    try {
      createMatchTemplate(values);

      toast.success("Match template successfully created");
      callback?.();
    } catch (error) {
      toast.error("Failed to create match template", {
        description: getErrorMessage(error),
      });
    }
  }

  const name = form.watch("name");
  const common = form.watch("config.common");
  const mode = form.watch("config.mode");
  const maps = form.watch("config.maps");

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-4">
        <div className="gap-2 space-y-2 grid sm:grid-cols-2 text-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h4 className="text-muted-foreground">General</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col">
                  <span className="font-semibold">Name</span>
                  <span className="truncate">{name}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h4 className="text-muted-foreground">Server</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col">
                  <span className="truncate">-</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <h4 className="text-muted-foreground">Common</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="flex flex-col">
              <span className="font-semibold">Chat Time</span>
              <span className="truncate">{common.chatTime}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Respawn Behaviour</span>
              <span className="truncate">{common.respawnBehaviour.tag}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Delay Before Next Map</span>
              <span className="truncate">{common.delayBeforeNextMap}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">
                Synchronize Players At Map Start
              </span>
              <span className="truncate">
                <BooleanDisplay
                  value={common.synchronizePlayersAtMapStart}
                  size={20}
                />
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">
                Synchronize Players At Round Start
              </span>
              <span className="truncate">
                <BooleanDisplay
                  value={common.synchronizePlayersAtRoundStart}
                  size={20}
                />
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Trust Client Simulation</span>
              <span className="truncate">
                {common.trustClientSimulation ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Use Crude Extrapolation</span>
              <span className="truncate">
                {common.useCrudeExtrapolation ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Warmup Duration</span>
              <span className="truncate">
                {common.warmupDuration.tag === "Seconds"
                  ? `${common.warmupDuration.value} seconds`
                  : common.warmupDuration.tag}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Warmup Timeout</span>
              <span className="truncate">
                {common.warmupTimeout.tag === "Seconds"
                  ? `${common.warmupTimeout.value} seconds`
                  : common.warmupTimeout.tag}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Warmup Number</span>
              <span className="truncate">{common.warmupNumber}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Force Laps Number</span>
              <span className="truncate">{common.forceLapsNumber.tag}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Deco Image URL Checkpoint</span>
              <span className="truncate">
                {common.decoImageUrlCheckpoint || "-"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">
                Deco Image URL Decal Sponsor 4X1
              </span>
              <span className="truncate">
                {common.decoImageUrlDecalSponsor4X1 || "-"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Deco Image URL Screen 16X1</span>
              <span className="truncate">
                {common.decoImageUrlScreen16X1 || "-"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Deco Image URL Screen 16X9</span>
              <span className="truncate">
                {common.decoImageUrlScreen16X9 || "-"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Deco Image URL Screen 8X1</span>
              <span className="truncate">
                {common.decoImageUrlScreen8X1 || "-"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Deco Image URL Who Am I URL</span>
              <span className="truncate">
                {common.decoImageUrlWhoAmIUrl || "-"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <h4 className="text-muted-foreground">Mode: {mode.tag}</h4>

          {mode.tag === "Rounds" && (
            <MatchTemplateRoundsSummary mode={mode.value} />
          )}
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <h4 className="text-muted-foreground">Map Pool</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="flex flex-col">
              <span className="font-semibold">Start Index</span>
              <span className="truncate">{maps.start}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Number of Maps</span>
              <span className="truncate">{maps.mapUids.length}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-between">
          <Button
            className="flex-1 max-w-32"
            variant="outline"
            onClick={onBack}
          >
            <IconArrowNarrowLeft />
            Previous
          </Button>
          <Button
            className="flex-1 max-w-fit"
            disabled={!form.formState.isValid || form.formState.isSubmitting}
            type="submit"
          >
            <IconPlus />
            Create Template
          </Button>
        </div>
      </div>
    </form>
  );
}
