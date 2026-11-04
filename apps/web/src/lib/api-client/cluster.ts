import type { getCluster } from "@/services/cluster";
import { apiGet } from "./http";
export const getClusterOverview = (
  signal?: AbortSignal,
): ReturnType<typeof getCluster> =>
  apiGet("/api/admin/cluster", undefined, { signal });
