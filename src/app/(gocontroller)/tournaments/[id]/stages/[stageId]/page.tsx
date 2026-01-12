import CompetitionInfo from "@/components/tournaments/competitions/competition-info";

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

      <div className="flex flex-col gap-2 sm:gap-4">
        <CompetitionInfo competitionId={Number(stageId)} />
      </div>
    </div>
  );
}
