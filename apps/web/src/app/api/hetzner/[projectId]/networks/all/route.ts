import { apiRoute } from "@/lib/api-route";
import { getAllNetworks } from "@/services/hetzner/networks";

export const GET = apiRoute<{ projectId: string }>(async ({ params }) => {
  return getAllNetworks(params.projectId);
});
