import { setScriptNameAs } from "@/actions/gbx/server-only/game";
import { toApiScriptInfo } from "@/lib/public-api/dto";
import { publicApiRoute } from "@/lib/public-api/route";
import { getModeScriptInfoAs } from "@/services/gbx/game";
import { getScriptInfo, setScript } from "@gcp/shared/public-api";

export const GET = publicApiRoute(getScriptInfo, async ({ actor, params }) => {
  const info = await getModeScriptInfoAs(actor, params.serverId);
  return { data: toApiScriptInfo(info) };
});

export const PUT = publicApiRoute(
  setScript,
  async ({ actor, params, body }) => {
    await setScriptNameAs(actor, params.serverId, body.script);
  },
);
