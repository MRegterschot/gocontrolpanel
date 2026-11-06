import { apiRoute } from "@/lib/api-route";
import { getServerTypes } from "@/services/hetzner/server-types";

export const GET = apiRoute<{ projectId: string }>(async ({ params }) => {
  return getServerTypes(params.projectId);
});
