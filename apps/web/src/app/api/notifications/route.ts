import { apiRoute } from "@/lib/api-route";
import { getNotifications } from "@/services/database/notifications";

export const GET = apiRoute(() => {
  return getNotifications();
});
