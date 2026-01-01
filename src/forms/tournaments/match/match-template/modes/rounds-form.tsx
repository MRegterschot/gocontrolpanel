import FormElement from "@/components/form/form-element";
import {
  ConfigFinishTimeoutSchema,
  ConfigMapsPerMatchSchema,
  ConfigPointsLimitSchema,
  ConfigRoundsPerMapSchema,
} from "@/types/tm-tourney-manager/config/enums";
import { ConfigRoundsSchemaType } from "@/types/tm-tourney-manager/config/rounds";
import { UseFormReturn } from "react-hook-form";
import { CreateMatchTemplateSchemaType } from "../create-match-template-schema";

export const DEFAULT_ROUNDS_CONFIG: ConfigRoundsSchemaType = {
  finishTimeout: { tag: "BasedOnMedal" },
  mapsPerMatch: { tag: "One" },
  pointsLimit: { tag: "PointsLimit", value: 50 },
  pointsRepartition: [10, 6, 4, 3, 2, 1],
  roundsPerMap: { tag: "Unlimited" },
  useCustomPointsRepartition: false,
  useTieBreaker: true,
};

const FINISH_TIMEOUT_OPTIONS = ConfigFinishTimeoutSchema.options.map((o) => ({
  label: o.shape.tag.value,
  value: o.shape.tag.value,
}));

const FINISH_TIMEOUT_DESCRIPTIONS = {
  BasedOnMedal:
    "Time based on the Author medal ( 5 seconds + Author time / 6 ).",
  Seconds: "Time in seconds.",
};

const ROUNDS_PER_MAP_OPTIONS = ConfigRoundsPerMapSchema.options.map((o) => ({
  label: o.shape.tag.value,
  value: o.shape.tag.value,
}));

const ROUNDS_PER_MAP_DESCRIPTIONS = {
  Unlimited: "Unlimited rounds.",
  Rounds: "A specific number of rounds per map.",
};

const MAPS_PER_MATCH_OPTIONS = ConfigMapsPerMatchSchema.options.map((o) => ({
  label: o.shape.tag.value,
  value: o.shape.tag.value,
}));

const MAPS_PER_MATCH_DESCRIPTIONS = {
  One: "One map will be played.",
  Maps: "A specific number of maps will be played.",
};

const POINTS_LIMIT_OPTIONS = ConfigPointsLimitSchema.options.map((o) => ({
  label: o.shape.tag.value,
  value: o.shape.tag.value,
}));

const POINTS_LIMIT_DESCRIPTIONS = {
  Unlimited: "Unlimited points limit.",
  PointsLimit: "A specific points limit.",
};

export default function RoundsForm({
  form,
}: {
  form: UseFormReturn<CreateMatchTemplateSchemaType>;
}) {
  const finishTimeout = form.watch("config.mode.value.finishTimeout.tag");
  const roundsPerMap = form.watch("config.mode.value.roundsPerMap.tag");
  const mapsPerMatch = form.watch("config.mode.value.mapsPerMatch.tag");
  const pointsLimit = form.watch("config.mode.value.pointsLimit.tag");

  return (
    <div className="gap-4 grid sm:grid-cols-2 sm:gap-8">
      <div className="flex flex-col gap-4">
        <FormElement
          name={"config.mode.value.finishTimeout.tag"}
          label="Finish Timeout"
          description={FINISH_TIMEOUT_DESCRIPTIONS[finishTimeout]}
          type="select"
          options={FINISH_TIMEOUT_OPTIONS}
          className="w-full max-w-40"
          placeholder="Finish timeout"
          isRequired
        />

        {finishTimeout === "Seconds" && (
          <FormElement
            name={"config.mode.value.finishTimeout.value"}
            label="Finish Timeout (seconds)"
            type="number"
            className="max-w-20"
            min={0}
            isRequired
            placeholder="30"
          />
        )}

        <FormElement
          name="config.mode.value.mapsPerMatch.tag"
          label="Maps Per Match"
          description={MAPS_PER_MATCH_DESCRIPTIONS[mapsPerMatch]}
          type="select"
          options={MAPS_PER_MATCH_OPTIONS}
          className="w-full max-w-32"
          isRequired
          placeholder="Maps per match"
        />

        {mapsPerMatch === "Maps" && (
          <FormElement
            name="config.mode.value.mapsPerMatch.value"
            label="Number of Maps Per Match"
            type="number"
            className="max-w-20"
            min={1}
            isRequired
            placeholder="3"
          />
        )}

        <FormElement
          name="config.mode.value.useTieBreaker"
          label="Use Tie Breaker"
          type="checkbox"
        />

        <FormElement
          name="config.mode.value.useCustomPointsRepartition"
          label="Use Custom Points Repartition"
          type="checkbox"
          isRequired
        />
      </div>
      <div className="flex flex-col gap-4">
        <FormElement
          name="config.mode.value.pointsLimit.tag"
          label="Points Limit"
          description={POINTS_LIMIT_DESCRIPTIONS[pointsLimit]}
          type="select"
          options={POINTS_LIMIT_OPTIONS}
          className="w-full max-w-32"
          isRequired
          placeholder="Points limit"
        />

        {pointsLimit === "PointsLimit" && (
          <FormElement
            name="config.mode.value.pointsLimit.value"
            label="Points Limit Value"
            type="number"
            className="max-w-20"
            min={1}
            isRequired
            placeholder="50"
          />
        )}

        <FormElement
          name="config.mode.value.pointsRepartition"
          label="Points Repartition"
          type="array-number"
          isRequired
          placeholder="10,6,4,3,2,1"
        />

        <FormElement
          name="config.mode.value.roundsPerMap.tag"
          label="Rounds Per Map"
          description={ROUNDS_PER_MAP_DESCRIPTIONS[roundsPerMap]}
          type="select"
          options={ROUNDS_PER_MAP_OPTIONS}
          className="w-full max-w-32"
          isRequired
          placeholder="Rounds per map"
        />

        {roundsPerMap === "Rounds" && (
          <FormElement
            name="config.mode.value.roundsPerMap.value"
            label="Number of Rounds Per Map"
            type="number"
            className="max-w-20"
            min={1}
            isRequired
            placeholder="3"
          />
        )}
      </div>
    </div>
  );
}
