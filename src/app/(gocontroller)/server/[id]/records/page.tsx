import { getMapRecordsPaginated } from "@/actions/database/maps";
import { getMatchesPaginated } from "@/actions/database/matches";
import { PaginationTable } from "@/components/table/pagination-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createMapsColumns } from "./maps-columns";
import { createMatchesColumns } from "./matches-columns";

export default async function ServerRecordsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Records</h1>
        <h4 className="text-muted-foreground">
          View and manage server records.
        </h4>
      </div>

      <Tabs defaultValue="matches" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="matches">Matches</TabsTrigger>
          <TabsTrigger value="maps">Maps</TabsTrigger>
        </TabsList>

        <TabsContent value="matches" className="flex flex-col gap-2">
          <PaginationTable
            createColumns={createMatchesColumns}
            args={id}
            fetchData={getMatchesPaginated}
            fetchArgs={{ serverId: id }}
            filter
          />
        </TabsContent>

        <TabsContent value="maps" className="flex flex-col gap-2">
          <PaginationTable
            createColumns={createMapsColumns}
            fetchData={getMapRecordsPaginated}
            fetchArgs={{ serverId: id }}
            filter
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
