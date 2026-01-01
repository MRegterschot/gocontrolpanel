"use client";

import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { ConfigCommonSchemaType } from "@/types/tm-tourney-manager/config/common";
import {
  ConfigLapsNumberSchema,
  ConfigRespawnBehaviourSchema,
  ConfigWarmupDurationSchema,
  ConfigWarmupTimeoutSchema,
} from "@/types/tm-tourney-manager/config/enums";
import { IconArrowNarrowLeft, IconArrowNarrowRight } from "@tabler/icons-react";
import { UseFormReturn } from "react-hook-form";
import { CreateMatchTemplateSchemaType } from "./create-match-template-schema";

export const DEFAULT_COMMON_CONFIG: ConfigCommonSchemaType = {
  chatTime: 10,
  respawnBehaviour: {
    tag: "Default",
  },
  delayBeforeNextMap: 2000,
  synchronizePlayersAtMapStart: true,
  synchronizePlayersAtRoundStart: true,
  trustClientSimulation: true,
  useCrudeExtrapolation: true,
  warmupDuration: {
    tag: "BasedOnMedal",
  },
  warmupTimeout: {
    tag: "BasedOnMedal",
  },
  warmupNumber: 0,
  decoImageUrlCheckpoint: "",
  decoImageUrlDecalSponsor4X1: "",
  decoImageUrlScreen16X1: "",
  decoImageUrlScreen16X9: "",
  decoImageUrlScreen8X1: "",
  decoImageUrlWhoAmIUrl: "",
  forceLapsNumber: { tag: "Validation" },
};

const RESPAWN_BEHAVIOUR_OPTIONS = ConfigRespawnBehaviourSchema.options.map(
  (o) => ({
    label: o.shape.tag.value,
    value: o.shape.tag.value,
  }),
);

const RESPAWN_BEHAVIOUR_DESCRIPTION = {
  Default: "Use the default behavior of the gamemode.",
  TimeAttack: "Use the normal behavior like in TimeAttack.",
  Ignore: "Do nothing.",
  GiveUpAtStart: "Give up before first checkpoint.",
  GiveUpAlways: "Always give up.",
  GiveUpNever: "Never give up.",
};

const WARMUP_DURATION_OPTIONS = ConfigWarmupDurationSchema.options.map((o) => ({
  label: o.shape.tag.value,
  value: o.shape.tag.value,
}));

const WARMUP_DURATION_DESCRIPTION = {
  OneTry: "Only one try like a round.",
  BasedOnMedal:
    "Time based on the Author medal ( 5 seconds + Author Time on 1 lap + ( Author Time on 1 lap / 6 ) ).",
  Seconds: "Time in seconds.",
};

const WARMUP_TIMEOUT_OPTIONS = ConfigWarmupTimeoutSchema.options.map((o) => ({
  label: o.shape.tag.value,
  value: o.shape.tag.value,
}));

const WARMUP_TIMEOUT_DESCRIPTION = {
  BasedOnMedal:
    "Time based on the Author medal ( 5 seconds + Author time / 6 ).",
  Seconds: "Time in seconds.",
};

const LAPS_NUMBER_OPTIONS = ConfigLapsNumberSchema.options.map((o) => ({
  label: o.shape.tag.value,
  value: o.shape.tag.value,
}));

const LAPS_NUMBER_DESCRIPTION = {
  Validation: "Use laps from map validation.",
  Independent: "Independent laps (only useful in TimeAttack).",
  Laps: "Number of laps.",
};

export default function CommonForm({
  form,
  onNext,
  onBack,
}: {
  form: UseFormReturn<CreateMatchTemplateSchemaType>;
  onNext: () => void;
  onBack: () => void;
}) {
  const respawnBehaviour = form.watch("config.common.respawnBehaviour.tag");
  const warmupDuration = form.watch("config.common.warmupDuration.tag");
  const warmupTimeout = form.watch("config.common.warmupTimeout.tag");
  const lapsNumber = form.watch("config.common.forceLapsNumber.tag");

  return (
    <form className="gap-4 grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-8">
      <div className="flex flex-col gap-4">
        <FormElement
          name={"config.common.chatTime"}
          className="max-w-24"
          label="Chat Time"
          description="Chat time at the end of a map or match in seconds."
          placeholder="Chat time"
          isRequired
          type="number"
        />

        <FormElement
          name={"config.common.respawnBehaviour.tag"}
          label="Respawn Behaviour"
          description={RESPAWN_BEHAVIOUR_DESCRIPTION[respawnBehaviour]}
          className="max-w-36 w-full"
          isRequired
          options={RESPAWN_BEHAVIOUR_OPTIONS}
          placeholder="Respawn behaviour"
          type="select"
        />

        <FormElement
          name={"config.common.delayBeforeNextMap"}
          className="max-w-32"
          label="Delay Before Next Map"
          description="Minimal time before the server go to the next map in milliseconds."
          placeholder="Delay before next map"
          isRequired
          type="number"
        />

        <FormElement
          name={"config.common.synchronizePlayersAtMapStart"}
          label="Synchronize Players At Map Start"
          description="Synchronize players at the launch of the map, to ensure that no one starts late. Can delay the start by a few seconds."
          isRequired
          placeholder="Synchronize players at map start"
          type="checkbox"
        />

        <FormElement
          name={"config.common.synchronizePlayersAtRoundStart"}
          label="Synchronize Players At Round Start"
          description="Synchronize players at the launch of each round, to ensure that no one starts late. Can delay the start by a few seconds."
          isRequired
          placeholder="Synchronize players at round start"
          type="checkbox"
        />
      </div>

      <div className="flex flex-col gap-4">
        <FormElement
          name={"config.common.trustClientSimulation"}
          label="Trust Client Simulation"
          description="No clear official informations about this setting. It would seem that this tells the server to trust or not trust the network data sent by the client."
          isRequired
          placeholder="Tust client simulation"
          type="checkbox"
        />

        <FormElement
          name={"config.common.useCrudeExtrapolation"}
          label="Use Crude Extrapolation"
          description="The car position of other players is extrapolated less precisely, disabling it has a big impact on performance. This replaces the 'S_UseDelayedVisuals' option by removing the delay with ghosts for the modes that need it (There may be a delay in TimeAttack)."
          isRequired
          placeholder="Use crude extrapolation"
          type="checkbox"
        />

        <FormElement
          name={"config.common.warmupDuration.tag"}
          label="Warmup Duration"
          description={WARMUP_DURATION_DESCRIPTION[warmupDuration]}
          className="max-w-44 w-full"
          isRequired
          placeholder="Warmup duration"
          options={WARMUP_DURATION_OPTIONS}
          type="select"
        />

        {warmupDuration === "Seconds" && (
          <FormElement
            name={"config.common.warmupDuration.value"}
            className="max-w-32"
            label="Warmup Duration Value"
            description="Warmup duration in seconds."
            isRequired
            placeholder="Warmup duration"
            type="number"
          />
        )}

        <FormElement
          name={"config.common.warmupTimeout.tag"}
          label="Warmup Timeout"
          description={WARMUP_TIMEOUT_DESCRIPTION[warmupTimeout]}
          className="max-w-44 w-full"
          isRequired
          placeholder="Warmup timeout"
          options={WARMUP_TIMEOUT_OPTIONS}
          type="select"
        />

        {warmupTimeout === "Seconds" && (
          <FormElement
            name={"config.common.warmupTimeout.value"}
            className="max-w-32"
            label="Warmup Timeout Value"
            description="Warmup timeout in seconds."
            isRequired
            placeholder="Warmup timeout"
            type="number"
          />
        )}
      </div>

      <div className="flex flex-col gap-4">
        <FormElement
          name={"config.common.warmupNumber"}
          className="max-w-32"
          label="Warmup Number"
          description="Number of warmup rounds before the match starts."
          isRequired
          placeholder="Warmup number"
          type="number"
        />

        <FormElement
          name={"config.common.forceLapsNumber.tag"}
          label="Force Laps Number"
          description={LAPS_NUMBER_DESCRIPTION[lapsNumber]}
          className="max-w-44 w-full"
          placeholder="Force laps number"
          isRequired
          options={LAPS_NUMBER_OPTIONS}
          type="select"
        />

        {lapsNumber === "Laps" && (
          <FormElement
            name={"config.common.forceLapsNumber.value"}
            className="max-w-32"
            label="Force Laps Number Value"
            description="Number of laps."
            placeholder="Force laps number"
            isRequired
            type="number"
          />
        )}

        <FormElement
          name={"config.common.decoImageUrlCheckpoint"}
          label="Deco Image URL Checkpoint"
          description="Url of the image displayed on the checkpoints ground. Override the image set in the Club."
          isRequired
          placeholder="Deco image url checkpoint"
          type="text"
        />

        <FormElement
          name={"config.common.decoImageUrlDecalSponsor4X1"}
          label="Deco Image URL Decal Sponsor 4X1"
          description="Url of the image displayed on the block border. Override the image set in the Club."
          isRequired
          placeholder="Deco image url decal sponsor 4x1"
          type="text"
        />
      </div>

      <div className="flex flex-col gap-4">
        <FormElement
          name={"config.common.decoImageUrlScreen16X1"}
          label="Deco Image URL Screen 16X1"
          description="Url of the image displayed below the podium and big screen. Override the image set in the Club."
          placeholder="Deco image url screen 16x1"
          isRequired
          type="text"
        />

        <FormElement
          name={"config.common.decoImageUrlScreen16X9"}
          label="Deco Image URL Screen 16X9"
          description="Url of the image displayed on the two big screens. Override the image set in the Club."
          placeholder="Deco image url screen 16x9"
          isRequired
          type="text"
        />

        <FormElement
          name={"config.common.decoImageUrlScreen8X1"}
          label="Deco Image URL Screen 8X1"
          description="Url of the image displayed on the bleachers. Override the image set in the Club."
          placeholder="Deco image url screen 8x1"
          isRequired
          type="text"
        />

        <FormElement
          name={"config.common.decoImageUrlWhoAmIUrl"}
          label="Deco Image URL Who Am I"
          description="Url of the API route to get the deco image url. You can replace ':ServerLogin' with a login from a server in another club to use its images."
          placeholder="Deco image url who am i"
          isRequired
          type="text"
        />

        <div className="flex gap-2 justify-between">
          <Button
            className="flex-1 max-w-32"
            variant="outline"
            onClick={onBack}
          >
            <IconArrowNarrowLeft />
            Previous
          </Button>
          <Button className="flex-1 max-w-32" type="button" onClick={onNext}>
            Next
            <IconArrowNarrowRight />
          </Button>
        </div>
      </div>
    </form>
  );
}
