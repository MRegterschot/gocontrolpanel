import { getPlayerInfo } from "@/actions/gbx/server-only";
import { AdminCommand } from "@/types/commands";
import { PlayerChat } from "@/types/gbx/player";
import "server-only";
import { GbxClientManager } from "./managers/gbxclient-manager";

export async function handleAdminCommand(
  manager: GbxClientManager,
  chat: PlayerChat,
  params: string[],
) {
  let player = manager.info.activePlayers.find((p) => p.login === chat.Login);

  if (!player) {
    player = await getPlayerInfo(manager.client, chat.Login);
  }

  const adminCommand: AdminCommand = {
    serverId: manager.getServerId(),
    login: player.login,
    name: player.nickName,
    message: params.join(" "),
    timestamp: new Date(),
  };

  manager.client.call(
    "ChatSendServerMessageToLogin",
    "Admins have been notified",
    chat.Login,
  );

  manager.emit("adminCommand", adminCommand);
}
