import {
  getDashboardActivity,
  getDashboardAdminStats,
  getDashboardHetznerProjects,
} from "@/lib/api-client/dashboard";
import { queryKeys, unwrap } from "@/lib/api-client/query";
import { useQuery } from "@tanstack/react-query";

// Each Hetzner project costs an API call against its rate limit, so don't refetch on every visit
const HETZNER_STALE_MS = 60 * 1000;

export const useDashboardHetzner = () =>
  useQuery({
    queryKey: queryKeys.dashboard("hetzner"),
    queryFn: ({ signal }) =>
      unwrap(getDashboardHetznerProjects(signal), "GetDashboardHetznerError"),
    staleTime: HETZNER_STALE_MS,
  });

export const useDashboardActivity = () =>
  useQuery({
    queryKey: queryKeys.dashboard("activity"),
    queryFn: ({ signal }) =>
      unwrap(getDashboardActivity(signal), "GetDashboardActivityError"),
  });

export const useDashboardAdminStats = () =>
  useQuery({
    queryKey: queryKeys.dashboard("admin"),
    queryFn: ({ signal }) =>
      unwrap(getDashboardAdminStats(signal), "GetDashboardAdminStatsError"),
  });
