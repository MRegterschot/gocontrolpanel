"use client";

import { useQueryErrorToast } from "@/hooks/use-query-error-toast";
import { getClubActivitiesList } from "@/lib/api-client/nadeo";
import { queryKeys, unwrap } from "@/lib/api-client/query";
import { getErrorMessage } from "@/lib/utils";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Button } from "../../ui/button";
import ActivityCard from "./activity-card";

export default function ClubActivities({
  serverId,
  fmHealth,
  clubId,
}: {
  serverId: string;
  fmHealth: boolean;
  clubId: number;
}) {
  const query = useInfiniteQuery({
    queryKey: queryKeys.club(clubId, "activities"),
    queryFn: ({ pageParam }) =>
      unwrap(
        getClubActivitiesList(clubId, pageParam),
        "GetClubActivitiesListError",
      ),
    initialPageParam: 0,
    // The offset of the next page is what has been loaded so far
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, p) => n + p.activityList.length, 0);
      return last.itemCount > loaded ? loaded : undefined;
    },
  });
  const activities = query.data?.pages.flatMap((p) => p.activityList) ?? null;
  const hasMore = query.hasNextPage;
  const loading = query.isFetching;
  const error = query.error
    ? "Failed to get activities: " + getErrorMessage(query.error)
    : null;
  useQueryErrorToast(query.error, "Failed to get activities");
  const loadActivities = () => query.fetchNextPage();

  return (
    <div className="flex flex-col gap-4">
      {error && <span>{error}</span>}

      {activities && activities.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-4">
            {activities.map((activity, index) => (
              <ActivityCard
                key={index}
                serverId={serverId}
                activity={activity}
                fmHealth={fmHealth}
              />
            ))}
          </div>

          {hasMore && (
            <Button
              variant={"outline"}
              className="max-w-32 mx-auto bg-background!"
              onClick={loadActivities}
              disabled={loading}
            >
              Load More
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
