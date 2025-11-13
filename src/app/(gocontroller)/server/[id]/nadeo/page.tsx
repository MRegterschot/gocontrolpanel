import ClubCampaignsTab from "@/components/nadeo/tabs/club-campaigns-tab";
import ClubsTab from "@/components/nadeo/tabs/clubs-tab";
import SeasonalTab from "@/components/nadeo/tabs/seasonal-tab";
import ShortsTab from "@/components/nadeo/tabs/shorts-tab";
import TotdTab from "@/components/nadeo/tabs/totd-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { hasPermission } from "@/lib/auth";
import { getFileManagerHealth } from "@/lib/managers/file-manager";
import { routePermissions, routes } from "@/routes";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function ServerNadeoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    offset?: string;
    campaign?: string;
    club?: string;
  }>;
}) {
  const { id } = await params;
  const { offset = "0", campaign, club } = await searchParams;

  const offsetInt = parseInt(offset);
  const campaignInt = campaign ? parseInt(campaign) : undefined;
  const clubInt = club ? parseInt(club) : undefined;

  const canView = await hasPermission(routePermissions.servers.nadeo, id);
  if (!canView) {
    redirect(routes.dashboard);
  }

  let fmHealth = false;
  try {
    fmHealth = await getFileManagerHealth(id);
  } catch (err) {
    console.error("Failed to fetch file manager:", err);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Nadeo</h1>
        <h4 className="text-muted-foreground">
          Search and download maps and campaigns from Nadeo servers.
        </h4>
      </div>

      <Tabs defaultValue="totd" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="totd">Track of the Day</TabsTrigger>
          <TabsTrigger value="seasonal">Seasonal Campaigns</TabsTrigger>
          <TabsTrigger value="shorts">Weekly Shorts</TabsTrigger>
          <TabsTrigger value="club-campaigns">Club Campaigns</TabsTrigger>
          <TabsTrigger value="clubs">Clubs</TabsTrigger>
        </TabsList>

        <TabsContent value="totd" className="flex flex-col gap-2">
          <TotdTab serverId={id} fmHealth={fmHealth} offset={offsetInt} />
        </TabsContent>

        <TabsContent value="seasonal" className="flex flex-col gap-2">
          <Suspense fallback={<p>Loading Seasonal Campaigns...</p>}>
            <SeasonalTab
              serverId={id}
              fmHealth={fmHealth}
              campaign={campaignInt}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="shorts" className="flex flex-col gap-2">
          <ShortsTab serverId={id} fmHealth={fmHealth} campaign={campaignInt} />
        </TabsContent>

        <TabsContent value="club-campaigns" className="flex flex-col gap-2">
          <ClubCampaignsTab
            serverId={id}
            fmHealth={fmHealth}
            clubId={clubInt}
            campaignId={campaignInt}
          />
        </TabsContent>

        <TabsContent value="clubs" className="flex flex-col gap-2">
          <ClubsTab serverId={id} fmHealth={fmHealth} clubId={clubInt} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
