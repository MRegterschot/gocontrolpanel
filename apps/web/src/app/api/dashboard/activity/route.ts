import { apiRoute } from "@/lib/api-route";
import { getDashboardActivity } from "@/services/dashboard";

export const GET = apiRoute(() => {
  return getDashboardActivity();
});
