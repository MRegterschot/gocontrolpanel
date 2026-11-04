"use client";
import Members from "./members";
import Roles from "./roles";
import { useCompetitionAccess } from "./use-competition-access";

export default function CompetitionPermissions({ id }: { id: number }) {
  const { isReady } = useCompetitionAccess(id);

  if (!isReady) return <p className="text-muted-foreground">Loading permissions...</p>;

  return (
    <div className="flex flex-col gap-6">
      <Members competitionId={id} />
      <Roles competitionId={id} />
      <p className="text-sm text-muted-foreground">
        Members of the competitions above have their permissions here as well. Only members can see this list.
      </p>
    </div>
  );
}
