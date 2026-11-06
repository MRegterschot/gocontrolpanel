import { apiRoute } from "@/lib/api-route";
import { getGroupApiKeys } from "@/services/database/api-keys";

export const GET = apiRoute<{ groupId: string }>(({ params }) =>
  getGroupApiKeys(params.groupId),
);
