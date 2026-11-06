import { setModeScriptSettingsAs } from "@/actions/gbx/server-only/game";
import { publicApiRoute } from "@/lib/public-api/route";
import { getModeScriptSettingsAs } from "@/services/gbx/game";
import {
  getScriptSettings,
  updateScriptSettings,
} from "@tmcontrolpanel/shared/public-api";

export const GET = publicApiRoute(
  getScriptSettings,
  async ({ actor, params }) => ({
    data: await getModeScriptSettingsAs(actor, params.serverId),
  }),
);

export const PATCH = publicApiRoute(
  updateScriptSettings,
  async ({ actor, params, body }) => {
    await setModeScriptSettingsAs(actor, params.serverId, body.settings);
  },
);
