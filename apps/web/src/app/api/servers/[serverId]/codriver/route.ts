import { apiRoute } from "@/lib/api-route";
import { getCodriverServerOverview } from "@/services/codriver";

export const GET = apiRoute<{ serverId: string }>(async ({ params }) => {
  return getCodriverServerOverview(params.serverId);
});
