import { publicApiRoute } from "@/lib/public-api/route";
import { listServers } from "@tmcontrolpanel/shared/public-api";

export const GET = publicApiRoute(listServers, async ({ principal }) => ({
  data: principal.servers,
}));
