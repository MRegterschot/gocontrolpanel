import { Team } from "@/types/live";
import TeamsActions from "./teams-actions";

interface MatchSettingsProps {
  pointsLimit?: number;
  roundsLimit?: number;
  mapLimit?: number;
  nbWinners?: number;
  serverId: string;
  teams?: Record<number, Team>;
  type: string;
}

export default function MatchSettings({
  pointsLimit,
  roundsLimit,
  mapLimit,
  nbWinners,
  serverId,
  teams,
  type,
}: MatchSettingsProps) {
  return (
    <div className="flex justify-center">
      <div className="flex-1" />
      <div className="text-lg font-bold flex-5 flex justify-center">
        {[
          pointsLimit && `Points Limit ${pointsLimit}`,
          roundsLimit && `Rounds Limit ${roundsLimit}`,
          mapLimit && `Map Limit ${mapLimit}`,
          nbWinners && `Winners ${nbWinners}`,
        ]
          .filter(Boolean)
          .map((item, idx, arr) => (
            <span key={idx} className="text-nowrap">
              {item}
              {idx < arr.length - 1 && <span className="mx-2">|</span>}
            </span>
          ))}
      </div>
      <div className="flex-1 flex justify-end">
        {["teams", "tmwt", "tmwc"].includes(type) && (
          <TeamsActions
            serverId={serverId}
            teams={teams || {}}
            type={type}
          />
        )}
      </div>
    </div>
  );
}
