import { apiRoute } from "@/lib/api-route";
import { getSSHKeys } from "@/services/hetzner/ssh-keys";

export const GET = apiRoute<{ projectId: string }>(async ({ params }) => {
  return getSSHKeys(params.projectId);
});
