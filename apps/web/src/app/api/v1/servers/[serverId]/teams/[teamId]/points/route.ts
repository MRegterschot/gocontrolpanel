import {
  setTeamMapPointsAs,
  setTeamMatchPointsAs,
  setTeamRoundPointsAs,
} from "@/actions/gbx/server-only/player";
import { publicApiRoute } from "@/lib/public-api/route";
import { setTeamPoints } from "@tmcontrolpanel/shared/public-api";

const SETTERS = {
  round: setTeamRoundPointsAs,
  map: setTeamMapPointsAs,
  match: setTeamMatchPointsAs,
};

export const PUT = publicApiRoute(
  setTeamPoints,
  async ({ actor, params, body }) => {
    await SETTERS[body.type](
      actor,
      params.serverId,
      params.teamId,
      body.points,
    );
  },
);
