import TournamentStages from "@/components/tournaments/tournament/tournament-competition-tree";
import TournamentInfo from "@/components/tournaments/tournament/tournament-info";

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Tournament Info</h1>
        <h4 className="text-muted-foreground">Manage the tournament info.</h4>
      </div>

      <div className="flex flex-col gap-2 sm:gap-4">
        <TournamentInfo tournamentId={Number(id)} />
        <TournamentStages tournamentId={Number(id)} />
      </div>
    </div>
  );
}
