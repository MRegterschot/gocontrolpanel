import { apiRoute } from "@/lib/api-route";
import { getRolesMinimal } from "@/services/database/roles";

export const GET = apiRoute(() => {
  return getRolesMinimal();
});
