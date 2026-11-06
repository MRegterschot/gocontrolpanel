import type * as Dashboard from "@/services/dashboard";
import { apiGet } from "./http";

export const getDashboardHetznerProjects = (
  signal?: AbortSignal,
): ReturnType<typeof Dashboard.getDashboardHetznerProjects> =>
  apiGet("/api/dashboard/hetzner", undefined, { signal });

export const getDashboardActivity = (
  signal?: AbortSignal,
): ReturnType<typeof Dashboard.getDashboardActivity> =>
  apiGet("/api/dashboard/activity", undefined, { signal });

export const getDashboardAdminStats = (
  signal?: AbortSignal,
): ReturnType<typeof Dashboard.getDashboardAdminStats> =>
  apiGet("/api/dashboard/admin", undefined, { signal, dates: true });
