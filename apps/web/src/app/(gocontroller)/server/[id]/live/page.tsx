import { getChatHistory, getServerPlayerInfo } from "@/actions/gbx/advanced";
import LiveDashboard from "@/components/live/live-dashboard";
import ServerUnavailable from "@/components/servers/server-unavailable";

export default async function LivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: serverPlayerInfo, error } = await getServerPlayerInfo(id);
  if (error) {
    return <ServerUnavailable error={error} />;
  }
  const { data: chatHistory } = await getChatHistory(id);

  return (
    <LiveDashboard
      serverId={id}
      serverPlayerInfo={serverPlayerInfo}
      chatHistory={(chatHistory ?? []).reverse()}
    />
  );
}
