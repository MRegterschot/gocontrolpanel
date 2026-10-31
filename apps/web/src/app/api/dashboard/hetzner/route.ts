import { apiRoute } from "@/lib/api-route";
import { getDashboardHetznerProjects } from "@/services/dashboard";

export const GET = apiRoute(() => {
  return getDashboardHetznerProjects();
});
