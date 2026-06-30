import CompetitionRegistrations from "@/components/tournaments/competitions/registrations/competition-registrations";

export default async function TournamentRegisrationsPage({
  params,
}: {
  params: Promise<{ id: string; stageId: string }>;
}) {
  const { stageId } = await params;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Registrations</h1>
        <h4 className="text-muted-foreground">
          Manage the stage registrations and view the registered players.
        </h4>
      </div>

      <div className="flex flex-col gap-2 sm:gap-4">
        <CompetitionRegistrations competitionId={Number(stageId)} />
      </div>
    </div>
  );
}
