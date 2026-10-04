import { apiRoute } from "@/lib/api-route";
import { getAllDatabases } from "@/services/hetzner/servers";

export const GET = apiRoute<{ projectId: string }>(async ({ params }) => {
  return getAllDatabases(params.projectId);
});
