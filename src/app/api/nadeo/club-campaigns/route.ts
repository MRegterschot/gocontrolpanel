import { getClubCampaignsPaginated } from "@/actions/nadeo/clubs";
import { paginatedRoute } from "@/lib/api/paginated-route";

export const GET = paginatedRoute(getClubCampaignsPaginated);
