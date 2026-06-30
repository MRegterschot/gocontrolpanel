"use client";

import { Card } from "@/components/ui/card";
import { Competition } from "@/hooks/tournaments/competitions/use-competition";
import CompetitionActions from "./competition-actions";

export default function CompetitionInfo({
  competition,
}: {
  competition: Competition;
}) {
  return (
    <Card className="p-4 flex flex-col sm:flex-row justify-between gap-4 sm:items-end">
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-col">
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-center gap-4">
              <h2
                className="text-lg font-bold truncate max-w-40 lg:max-w-92 xl:max-w-lg"
                title={competition.name}
              >
                {competition.name}
              </h2>
              {/* <CompetitionStatusBadge status={competition.status} /> */}
            </div>

            <div className="flex gap-2 items-center ml-auto">
              <CompetitionActions competition={competition} />
            </div>
          </div>

          <div className="flex flex-col">
            {/* {(competition.startingAt || competition.endingAt) && (
              <div
                className="flex gap-2 items-center text-muted-foreground text-sm"
                title={`
                ${competition.startingAt ? competition.startingAt.toDate().toLocaleString() : "N/A"} - ${competition.endingAt ? competition.endingAt.toDate().toLocaleString() : "N/A"}
              `}
              >
                <IconCalendar size={16} />

                {competition.startingAt && (
                  <span>
                    {competition.startingAt
                      .toDate()
                      .toLocaleDateString("en-UK", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                  </span>
                )}

                {competition.startingAt && competition.endingAt && (
                  <span>-</span>
                )}

                {competition.endingAt && (
                  <span>
                    {competition.endingAt.toDate().toLocaleDateString("en-UK", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                )}
              </div>
            )}

            <div className="space-x-2 sm:mt-1">
              <RegistrationBadge
                registrationSettings={competition.registrationSettings}
              />
            </div> */}
          </div>
        </div>
      </div>
    </Card>
  );
}
