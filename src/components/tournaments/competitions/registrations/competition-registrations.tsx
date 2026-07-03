"use client";
import { DataTable } from "@/components/table/data-table";
import { useRegistrationsByCompetitionId } from "@/hooks/tournaments/competitions/registrations/use-registrations";
import { Competition } from "@/hooks/tournaments/competitions/use-competition";
import { createActions } from "./actions";
import { createColumnns } from "./columns";

export default function CompetitionRegistrations({
  competition,
}: {
  competition: Competition;
}) {
  const { registrations, registration } = useRegistrationsByCompetitionId(
    competition.id,
  );

  const columns = createColumnns(registration?.status);
  const actions = createActions(registration);

  return (
    <DataTable
      columns={columns}
      actions={actions}
      data={registrations}
      filter
      pagination
    />
  );
}
