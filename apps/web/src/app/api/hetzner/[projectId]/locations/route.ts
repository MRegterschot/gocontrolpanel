import { apiRoute } from "@/lib/api-route";
import { getHetznerLocations } from "@/services/hetzner/locations";

export const GET = apiRoute<{ projectId: string }>(async ({ params }) => {
  return getHetznerLocations(params.projectId);
});
