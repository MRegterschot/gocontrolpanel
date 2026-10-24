import { forceSpectatorAs } from "@/actions/gbx/server-only/player";
import { publicApiRoute } from "@/lib/public-api/route";
import { forceSpectator } from "@gcp/shared/public-api";

// The dedicated server's ForceSpectator status values
const STATUS = {
  selectable: 0,
  spectator: 1,
  player: 2,
  spectatorSelectable: 3,
} as const;

export const POST = publicApiRoute(
  forceSpectator,
  async ({ actor, params, body }) => {
    await forceSpectatorAs(
      actor,
      params.serverId,
      params.login,
      STATUS[body.mode],
    );
  },
);
