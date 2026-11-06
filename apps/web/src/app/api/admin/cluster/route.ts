import { apiRoute } from "@/lib/api-route";
import { getCluster } from "@/services/cluster";
export const GET = apiRoute(() => getCluster());
