import BanlistList from "@/components/players/banlist-list";
import BlacklistList from "@/components/players/blacklist-list";
import GuestlistList from "@/components/players/guestlist-list";
import PlayerList from "@/components/players/player-list";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TabsContent } from "@radix-ui/react-tabs";

export default async function ServerPlayersPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = await params;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Server Players</h1>
        <h4 className="text-muted-foreground">Manage server players.</h4>
      </div>

      <Tabs defaultValue="players" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="players">Players</TabsTrigger>
          <TabsTrigger value="banlist">Banlist</TabsTrigger>
          <TabsTrigger value="blacklist">Blacklist</TabsTrigger>
          <TabsTrigger value="guestlist">Guestlist</TabsTrigger>
        </TabsList>

        <TabsContent value="players" className="flex flex-col gap-2">
          <PlayerList serverUuid={uuid} />
        </TabsContent>
        <TabsContent value="banlist" className="flex flex-col gap-2">
          <BanlistList serverUuid={uuid} />
        </TabsContent>
        <TabsContent value="blacklist" className="flex flex-col gap-2">
          <BlacklistList serverUuid={uuid} />
        </TabsContent>
        <TabsContent value="guestlist" className="flex flex-col gap-2">
          <GuestlistList serverUuid={uuid} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
