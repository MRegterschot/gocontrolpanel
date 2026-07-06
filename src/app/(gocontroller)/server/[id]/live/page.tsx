import { getChatHistory, getServerPlayerInfo } from "@/actions/gbx/advanced";
import LiveDashboard from "@/components/live/live-dashboard";

export default async function LivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: serverPlayerInfo } = await getServerPlayerInfo(id);
  const { data: chatHistory } = await getChatHistory(id);

  return (
    <LiveDashboard
      serverId={id}
      serverPlayerInfo={serverPlayerInfo}
      chatHistory={chatHistory.reverse()}
    />
  );
}
