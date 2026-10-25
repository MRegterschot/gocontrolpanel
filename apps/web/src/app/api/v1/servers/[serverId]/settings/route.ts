import { saveServerSettingsAs } from "@/actions/gbx/server-only/server";
import { publicApiRoute } from "@/lib/public-api/route";
import {
  applyServerSettingsChanges,
  toApiServerSettings,
} from "@/lib/public-api/settings";
import { getServerSettingsAs } from "@/services/gbx/server";
import { getSettings, updateSettings } from "@tmcontrolpanel/shared/public-api";

export const GET = publicApiRoute(getSettings, async ({ actor, params }) => {
  const settings = await getServerSettingsAs(actor, params.serverId);
  return { data: toApiServerSettings(settings) };
});

export const PATCH = publicApiRoute(
  updateSettings,
  async ({ actor, params, body }) => {
    const current = await getServerSettingsAs(actor, params.serverId);
    const next = applyServerSettingsChanges(current, body);
    // saveServerSettingsAs converts units in place, so it gets its own copy
    await saveServerSettingsAs(actor, params.serverId, structuredClone(next));
    return { data: toApiServerSettings(next) };
  },
);
