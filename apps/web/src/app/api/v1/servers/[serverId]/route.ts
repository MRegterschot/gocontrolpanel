import { notFound, publicApiRoute } from "@/lib/public-api/route";
import { getServer } from "@tmcontrolpanel/shared/public-api";

export const GET = publicApiRoute(getServer, async ({ principal, params }) => {
  // The wrapper already rejected servers the key cannot reach
  const server = principal.servers.find((s) => s.id === params.serverId);
  if (!server) throw notFound("Server not found");
  return { data: server };
});
