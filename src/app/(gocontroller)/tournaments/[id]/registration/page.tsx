import RegistrationInfo from "@/components/tournaments/registration/registration-info";

export default async function TournamentRegistrationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Tournament Registration</h1>
        <h4 className="text-muted-foreground">
          Manage the tournament registrations.
        </h4>
      </div>

      <RegistrationInfo tournamentId={Number(id)} />
    </div>
  );
}
