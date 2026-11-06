import { publicApiRoute } from "@/lib/public-api/route";
import { getScriptNameAs, getShowOpponentsAs } from "@/services/gbx/game";
import { getGame } from "@tmcontrolpanel/shared/public-api";

export const GET = publicApiRoute(getGame, async ({ actor, params }) => {
  const [script, opponents] = await Promise.all([
    getScriptNameAs(actor, params.serverId),
    getShowOpponentsAs(actor, params.serverId),
  ]);
  return {
    data: {
      script: { current: script.CurrentValue, next: script.NextValue },
      showOpponents: {
        current: opponents.CurrentValue,
        next: opponents.NextValue,
      },
    },
  };
});
