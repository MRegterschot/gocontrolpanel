"use client";

import CompetitionBracket from "@/components/tournaments/competitions/bracket/competition-bracket";
import CompetitionInfo from "@/components/tournaments/competitions/competition-info";
import CompetitionRegistrations from "@/components/tournaments/competitions/registrations/competition-registrations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCompetition } from "@/hooks/tournaments/competitions/use-competition";

export default function StagePage({
  stageId,
}: {
  stageId: number;
}) {
  const { competition, isReady } = useCompetition(stageId);

  if (!isReady) {
    return <span>Loading...</span>;
  }

  if (!competition) {
    return <span>Competition not found</span>;
  }

  return (
    <div className="flex flex-col gap-2">
      <CompetitionInfo competition={competition} />

      <Tabs defaultValue="bracket" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="bracket">Bracket</TabsTrigger>
          <TabsTrigger value="registrations">Registrations</TabsTrigger>
        </TabsList>

        <TabsContent value="bracket" className="flex flex-col gap-6">
          <CompetitionBracket competition={competition} />
        </TabsContent>

        <TabsContent value="registrations" className="flex flex-col gap-6">
          <CompetitionRegistrations competition={competition} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
