import { apiRoute } from "@/lib/api-route";
import { getCodriverChatAccess } from "@/services/codriver";
export const GET = apiRoute<{ serverId: string }>(({ params }) =>
  getCodriverChatAccess(params.serverId),
);
