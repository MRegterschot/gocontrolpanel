import { apiRoute } from "@/lib/api-route";
import { getEcmApiKey } from "@/services/database/ecircuitmania";

export const GET = apiRoute<{ serverId: string }>(({ params }) =>
  getEcmApiKey(params.serverId),
);
