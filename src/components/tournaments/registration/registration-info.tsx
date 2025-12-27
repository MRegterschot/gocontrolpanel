"use client";

import Modal from "@/components/modals/modal";
import EditRegistrationSettingsModal from "@/components/modals/tournaments/competition/edit-registration-settings";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { tables } from "@/lib/tourney-manager";
import { IconUsersGroup } from "@tabler/icons-react";
import { eq, useTable, where } from "spacetimedb/react";

export default function RegistrationInfo({
  tournamentId,
}: {
  tournamentId: number;
}) {
  const [competitionRows] = useTable(
    tables.competition,
    where(eq("id", tournamentId)),
  );

  const rootCompetition = competitionRows.find((c) => !c.parentId);

  if (!rootCompetition) {
    return <span>Tournament not found</span>;
  }

  return (
    <Card className="p-4">
      <Modal>
        <EditRegistrationSettingsModal
          data={{
            competitionId: rootCompetition.id,
            registrationSettings: rootCompetition.registrationSettings,
          }}
        />
        <Button variant={"outline"}>
          <IconUsersGroup />
          Edit Registration Settings
        </Button>
      </Modal>
    </Card>
  );
}
