import { apiRoute } from "@/lib/api-route";
import { getServerApiKeys } from "@/services/database/api-keys";

export const GET = apiRoute<{ serverId: string }>(({ params }) =>
  getServerApiKeys(params.serverId),
);
