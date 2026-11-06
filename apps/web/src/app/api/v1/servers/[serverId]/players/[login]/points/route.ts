import {
  setPlayerMapPointsAs,
  setPlayerMatchPointsAs,
  setPlayerRoundPointsAs,
} from "@/actions/gbx/server-only/player";
import { publicApiRoute } from "@/lib/public-api/route";
import { setPlayerPoints } from "@tmcontrolpanel/shared/public-api";

const SETTERS = {
  round: setPlayerRoundPointsAs,
  map: setPlayerMapPointsAs,
  match: setPlayerMatchPointsAs,
};

export const PUT = publicApiRoute(
  setPlayerPoints,
  async ({ actor, params, body }) => {
    await SETTERS[body.type](actor, params.serverId, params.login, body.points);
  },
);
