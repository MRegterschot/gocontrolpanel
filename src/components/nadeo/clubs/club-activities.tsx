"use client";

import { getClubActivitiesList } from "@/actions/nadeo/clubs";
import { getErrorMessage } from "@/lib/utils";
import { ClubActivity } from "@/types/api/nadeo";
import { ServerError } from "@/types/responses";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
  const [activities, setActivities] = useState<ClubActivity[] | null>(null);

  const [hasMore, setHasMore] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadActivities = async () => {
    if (loading || !hasMore) return;

    try {
      setLoading(true);

      const { data, error } = await getClubActivitiesList(
        clubId,
        activities?.length ?? 0,
      );
      if (error) {
        throw new ServerError(error, "GetClubActivitiesListError");
      }

      const newActivities = [...(activities || []), ...data.activityList];

      setActivities(newActivities);
      setHasMore(data.itemCount > newActivities.length);
    } catch (err) {
      setError("Failed to get activities: " + getErrorMessage(err));
      toast.error("Failed to get activities", {
        description: getErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [clubId]);

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
              onClick={() => loadActivities()}
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
