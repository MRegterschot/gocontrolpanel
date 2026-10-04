import { apiRoute } from "@/lib/api-route";
import { getServersMinimal } from "@/services/database/servers";

export const GET = apiRoute(() => {
  return getServersMinimal();
});
