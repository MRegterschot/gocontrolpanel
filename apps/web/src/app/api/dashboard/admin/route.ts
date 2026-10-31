import { apiRoute } from "@/lib/api-route";
import { getDashboardAdminStats } from "@/services/dashboard";

export const GET = apiRoute(() => {
  return getDashboardAdminStats();
});
