"use client";

import { useRegistrationsByCompetitionId } from "@/hooks/tournaments/competitions/registrations/use-registrations";

export default function CompetitionRegistrations({
  competitionId,
}: {
  competitionId: number;
}) {
  const { registrations } = useRegistrationsByCompetitionId(competitionId);

  return (
    <div className="flex flex-col gap-2 sm:gap-4">
      {registrations.map((registration) => (
        <div
          key={registration.userId}
          className="flex flex-col gap-1 rounded-lg border p-4"
        >
          <h3 className="text-lg font-semibold">{registration.name}</h3>
          <p className="text-sm text-muted-foreground">
            User ID: {registration.userId}
          </p>
        </div>
      ))}
    </div>
  );
}
