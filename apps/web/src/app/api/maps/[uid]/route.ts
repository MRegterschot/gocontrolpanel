import { apiRoute } from "@/lib/api-route";
import { getMapByUid } from "@/services/database/maps";

export const GET = apiRoute<{ uid: string }>(async ({ params }) => {
  return getMapByUid(params.uid);
});
