import CompetitionDashboard from "@/components/tournaments/competitions/competition-dashboard";
import { Button } from "@/components/ui/button";
import { IconArrowLeft, IconUsers } from "@tabler/icons-react";
import Link from "next/link";

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ id: string; stageId: string }>;
}) {
  const { id, stageId } = await params;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Stage Info</h1>
        <h4 className="text-muted-foreground">
          Manage the stage info and edit matches and their connections.
        </h4>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild className="max-w-44">
          <Link href={`/tournaments/${id}`}>
            <IconArrowLeft />
            Back to tournament
          </Link>
        </Button>

        <Button variant="outline" asChild className="max-w-44">
          <Link href={`/tournaments/${id}/stages/${stageId}/registrations`}>
            <IconUsers />
            Registrations
          </Link>
        </Button>
      </div>

      <CompetitionDashboard competitionId={Number(stageId)} />
    </div>
  );
}
