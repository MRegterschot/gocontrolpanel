import BooleanDisplay from "@/components/boolean-display";
import { ConfigRoundsSchemaType } from "@/types/tm-tourney-manager/config/rounds";

export default function MatchTemplateRoundsSummary({
  mode,
}: {
  mode: ConfigRoundsSchemaType;
}) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="flex flex-col">
          <span className="font-semibold">Finish Timeout</span>
          <span>
            {mode.finishTimeout.tag === "BasedOnMedal"
              ? "BasedOnMedal"
              : `${mode.finishTimeout.value} seconds`}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="font-semibold">Maps Per Match</span>
          <span>
            {mode.mapsPerMatch.tag === "One" ? "1" : mode.mapsPerMatch.value}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="font-semibold">Points Limit</span>
          <span>
            {mode.pointsLimit.tag === "Unlimited"
              ? "Unlimited"
              : mode.pointsLimit.value}
          </span>
        </div>

        <div className="flex flex-col">
          <span className="font-semibold">Use Custom Points Repartition</span>
          <span>
            <BooleanDisplay value={mode.useCustomPointsRepartition} size={20} />
          </span>
        </div>

        <div className="flex flex-col">
          <span className="font-semibold">Points Repartition</span>
          <span>{mode.pointsRepartition.join(", ")}</span>
        </div>

        <div className="flex flex-col">
          <span className="font-semibold">Rounds Per Map</span>
          <span>
            {mode.roundsPerMap.tag === "Unlimited"
              ? "Unlimited"
              : mode.roundsPerMap.value}
          </span>
        </div>

        <div className="flex flex-col">
          <span className="font-semibold">Use Tie Breaker</span>
          <span>
            <BooleanDisplay value={mode.useTieBreaker} size={20} />
          </span>
        </div>
      </div>
    </div>
  );
}
