import { saveServerPluginConfigAs } from "@/actions/server-only/plugins";
import { publicApiRoute } from "@/lib/public-api/route";
import type { PluginConfig } from "@gcp/shared";
import { updatePluginConfig } from "@gcp/shared/public-api";

export const PUT = publicApiRoute(
  updatePluginConfig,
  async ({ actor, params, body }) => {
    // Checked against the plugin's own settings schema before it is stored
    await saveServerPluginConfigAs(
      actor,
      params.serverId,
      params.pluginId,
      body.config as PluginConfig,
      body.clearedSecrets,
    );
  },
);
