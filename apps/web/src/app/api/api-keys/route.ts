import { paginatedRoute } from "@/lib/api-route";
import { getApiKeysPaginated } from "@/services/database/api-keys";

export const GET = paginatedRoute(getApiKeysPaginated);
