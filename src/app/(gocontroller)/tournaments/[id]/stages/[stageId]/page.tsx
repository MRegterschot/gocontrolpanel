import CompetitionDashboard from "@/components/tournaments/competitions/competition-dashboard";

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ stageId: string }>;
}) {
  const { stageId } = await params;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Stage Info</h1>
        <h4 className="text-muted-foreground">
          Manage the stage info and edit matches and their connections.
        </h4>
      </div>

      <CompetitionDashboard competitionId={Number(stageId)} />
    </div>
  );
}
