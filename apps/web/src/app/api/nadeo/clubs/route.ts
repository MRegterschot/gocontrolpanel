import { paginatedRoute } from "@/lib/api-route";
import { getClubsPaginated } from "@/services/nadeo/clubs";

export const GET = paginatedRoute(getClubsPaginated);
