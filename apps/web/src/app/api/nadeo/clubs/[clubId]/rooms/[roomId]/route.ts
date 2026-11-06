import { apiRoute, intParam, parse } from "@/lib/api-route";
import { getClubRoomWithNamesAndMaps } from "@/services/nadeo/clubs";
import { z } from "zod";

export const GET = apiRoute<{ clubId: string; roomId: string }>(
  async ({ params }) => {
    const p = parse(z.object({ clubId: intParam, roomId: intParam }), params);
    return getClubRoomWithNamesAndMaps(p.clubId, p.roomId);
  },
);
