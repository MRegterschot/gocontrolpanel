import { PaginationTable } from "@/components/table/pagination-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ServerRecordsActions from "./actions";
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
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Records</h1>
          <h4 className="text-muted-foreground">
            View and manage server records.
          </h4>
        </div>
        <ServerRecordsActions serverId={id} />
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
            endpoint={`/api/servers/${id}/matches`}
            filter
          />
        </TabsContent>

        <TabsContent value="maps" className="flex flex-col gap-2">
          <PaginationTable
            createColumns={createMapsColumns}
            endpoint={`/api/servers/${id}/records`}
            filter
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
