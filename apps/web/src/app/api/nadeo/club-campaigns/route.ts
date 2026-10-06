import { paginatedRoute } from "@/lib/api-route";
import { getClubCampaignsPaginated } from "@/services/nadeo/clubs";

export const GET = paginatedRoute(getClubCampaignsPaginated);
