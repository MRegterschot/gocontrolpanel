import { paginatedRoute } from "@/lib/api-route";
import { getHetznerProjectsPaginated } from "@/services/database/hetzner-projects";

export const GET = paginatedRoute(getHetznerProjectsPaginated);
