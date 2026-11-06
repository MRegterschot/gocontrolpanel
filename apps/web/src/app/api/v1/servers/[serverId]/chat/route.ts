import { sendChatMessageAs } from "@/actions/gbx/server-only/advanced";
import { publicApiRoute } from "@/lib/public-api/route";
import { getChatHistoryAs } from "@/services/gbx/advanced";
import { getChat, sendChat } from "@tmcontrolpanel/shared/public-api";

export const GET = publicApiRoute(getChat, async ({ actor, params }) => ({
  data: await getChatHistoryAs(actor, params.serverId),
}));

export const POST = publicApiRoute(
  sendChat,
  async ({ actor, params, body }) => {
    await sendChatMessageAs(actor, params.serverId, body.message, body.login);
  },
);
